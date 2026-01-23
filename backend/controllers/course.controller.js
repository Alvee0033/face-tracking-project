const { supabase, supabaseAdmin } = require('../config/supabase');
const youtubeService = require('../services/youtube.service');

/**
 * Get all courses for the authenticated candidate grouped by roadmap
 */
const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get active courses
    const { data: courses, error: coursesError } = await supabase
      .from('candidate_courses')
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .eq('is_archived', false)
      .order('phase_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (coursesError) {
      throw coursesError;
    }

    // Get current roadmap to group courses by phases
    const { data: roadmap } = await supabase
      .from('candidate_learning_roadmaps')
      .select('roadmap_data')
      .eq('candidate_id', candidateProfile.id)
      .single();

    res.json({
      message: 'Courses retrieved successfully',
      courses: courses || [],
      roadmap: roadmap?.roadmap_data || null
    });

  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve courses'
    });
  }
};

/**
 * Add a course for a specific skill by searching YouTube
 */
const addCourseForSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillName, skillLevel, phaseNumber } = req.body;

    if (!skillName || !skillLevel) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'skillName and skillLevel are required'
      });
    }

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Check if courses already exist for this skill
    const { data: existingCourses } = await supabase
      .from('candidate_courses')
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .eq('skill_name', skillName)
      .eq('skill_level', skillLevel);

    if (existingCourses && existingCourses.length > 0) {
      return res.json({
        message: 'Courses already exist for this skill',
        courses: existingCourses
      });
    }

    // Search YouTube for videos (1-5 videos)
    const { learningPath } = req.body;
    const videos = await youtubeService.searchCourseForSkill(skillName, skillLevel, learningPath, 5);

    if (!videos || videos.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No videos found for this skill'
      });
    }

    // Insert all videos as courses
    const coursesToInsert = videos.map(video => ({
      candidate_id: candidateProfile.id,
      skill_name: skillName,
      skill_level: skillLevel,
      phase_number: phaseNumber,
      youtube_video_id: video.videoId,
      video_title: video.title,
      video_description: video.description,
      thumbnail_url: video.thumbnailUrl,
      channel_name: video.channelName,
      duration: video.duration,
      published_at: video.publishedAt
    }));

    const { data: courses, error: insertError } = await supabase
      .from('candidate_courses')
      .insert(coursesToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    res.json({
      message: `Added ${courses.length} course(s) successfully`,
      courses
    });

  } catch (error) {
    console.error('Add course error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to add course'
    });
  }
};

/**
 * Mark a course as watched/unwatched
 */
const updateWatchStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;
    const { isWatched } = req.body;

    if (typeof isWatched !== 'boolean') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'isWatched must be a boolean'
      });
    }

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Update watch status
    const { data: course, error: updateError } = await supabase
      .from('candidate_courses')
      .update({
        is_watched: isWatched,
        watched_at: isWatched ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('candidate_id', candidateProfile.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    if (!course) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    res.json({
      message: 'Watch status updated',
      course
    });

  } catch (error) {
    console.error('Update watch status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update watch status'
    });
  }
};

/**
 * Delete a course
 */
const deleteCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Delete course
    const { error: deleteError } = await supabase
      .from('candidate_courses')
      .delete()
      .eq('id', courseId)
      .eq('candidate_id', candidateProfile.id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete course'
    });
  }
};

/**
 * Get archived courses
 */
const getArchivedCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get archived courses
    const { data: courses, error: coursesError } = await supabase
      .from('candidate_courses')
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });

    if (coursesError) {
      throw coursesError;
    }

    res.json({
      message: 'Archived courses retrieved successfully',
      courses: courses || []
    });

  } catch (error) {
    console.error('Get archived courses error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve archived courses'
    });
  }
};

/**
 * Auto-populate courses for all skills in roadmap
 */
const autoPopulateCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get current roadmap
    const { data: roadmap } = await supabase
      .from('candidate_learning_roadmaps')
      .select('roadmap_data')
      .eq('candidate_id', candidateProfile.id)
      .single();

    if (!roadmap || !roadmap.roadmap_data || !roadmap.roadmap_data.learning_phases) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No roadmap found. Please generate a roadmap first.'
      });
    }

    // Get existing courses
    const { data: existingCourses } = await supabase
      .from('candidate_courses')
      .select('skill_name, skill_level')
      .eq('candidate_id', candidateProfile.id)
      .eq('is_archived', false);

    console.log('Auto-populate - Existing courses:', existingCourses?.length || 0);

    const existingSkills = new Set(
      (existingCourses || []).map(c => `${c.skill_name}-${c.skill_level}`)
    );

    console.log('Auto-populate - Existing skill keys:', Array.from(existingSkills));

    // Collect all skills from roadmap
    const skillsToProcess = [];
    roadmap.roadmap_data.learning_phases.forEach((phase) => {
      if (phase.skills && Array.isArray(phase.skills)) {
        phase.skills.forEach((skill) => {
          const level = skill.skill_type === 'upgrade' ? skill.target_level : (skill.difficulty || skill.target_level || 'Intermediate');
          const skillKey = `${skill.skill}-${level}`;
          console.log(`Checking skill: ${skill.skill} -> Key: ${skillKey}, Exists: ${existingSkills.has(skillKey)}`);
          if (!existingSkills.has(skillKey)) {
            skillsToProcess.push({
              skillName: skill.skill,
              skillLevel: level,
              phaseNumber: phase.phase,
              learningPath: skill.learning_path || ''
            });
          }
        });
      }
    });

    console.log('Auto-populate - Skills to process:', skillsToProcess.length);
    console.log('Auto-populate - Skills list:', skillsToProcess.map(s => `${s.skillName} (${s.skillLevel})`));

    if (skillsToProcess.length === 0) {
      console.log('Auto-populate - All courses already populated');
      return res.json({
        message: 'All courses already populated',
        coursesAdded: 0,
        skillsProcessed: 0
      });
    }

    // Process skills in batches to avoid overwhelming the API
    const results = [];
    for (const skill of skillsToProcess) {
      try {
        console.log(`Processing skill: ${skill.skillName} (${skill.skillLevel})`);
        const videos = await youtubeService.searchCourseForSkill(
          skill.skillName,
          skill.skillLevel,
          skill.learningPath,
          5
        );

        console.log(`Found ${videos?.length || 0} videos for ${skill.skillName}`);

        if (videos && videos.length > 0) {
          const coursesToInsert = videos.map(video => ({
            candidate_id: candidateProfile.id,
            skill_name: skill.skillName,
            skill_level: skill.skillLevel,
            phase_number: skill.phaseNumber,
            youtube_video_id: video.videoId,
            video_title: video.title,
            video_description: video.description,
            thumbnail_url: video.thumbnailUrl,
            channel_name: video.channelName,
            duration: video.duration,
            published_at: video.publishedAt
          }));

          const { data: courses, error: insertError } = await supabase
            .from('candidate_courses')
            .insert(coursesToInsert)
            .select();

          if (insertError) {
            console.error(`Error inserting courses for ${skill.skillName}:`, insertError);
          } else if (courses) {
            console.log(`Successfully inserted ${courses.length} courses for ${skill.skillName}`);
            results.push(...courses);
          }
        } else {
          console.warn(`No videos found for ${skill.skillName}`);
        }
      } catch (error) {
        console.error(`Error adding courses for ${skill.skillName}:`, error);
        // Continue with next skill
      }
    }

    console.log(`Auto-populate complete: ${results.length} courses added`);

    res.json({
      message: `Auto-populated ${results.length} course(s) for ${skillsToProcess.length} skill(s)`,
      coursesAdded: results.length,
      skillsProcessed: skillsToProcess.length
    });

  } catch (error) {
    console.error('Auto-populate courses error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to auto-populate courses'
    });
  }
};

module.exports = {
  getMyCourses,
  addCourseForSkill,
  updateWatchStatus,
  deleteCourse,
  getArchivedCourses,
  autoPopulateCourses
};

