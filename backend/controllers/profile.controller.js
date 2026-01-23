const { supabase, supabaseAdmin } = require('../config/supabase');
const AIAnalysisService = require('../services/aiAnalysis.service');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to trigger re-analysis for all pending/shortlisted applications
const triggerReAnalysisForCandidate = async (candidateId) => {
  try {
    console.log(`🔄 Triggering re-analysis for candidate ${candidateId}`);

    // Get all active applications (pending or shortlisted) for this candidate
    const { data: applications } = await supabaseAdmin
      .from('job_applications')
      .select('id')
      .eq('candidate_id', candidateId)
      .in('status', ['pending', 'shortlisted']);

    if (!applications || applications.length === 0) {
      console.log(`No active applications found for candidate ${candidateId}`);
      return;
    }

    console.log(`Found ${applications.length} active applications to re-analyze`);

    // Re-analyze each application in the background
    for (const app of applications) {
      setImmediate(async () => {
        try {
          // Get full application data
          const { data: fullApplication } = await supabaseAdmin
            .from('job_applications')
            .select(`
              id,
              candidate:candidate_profiles(
                id,
                bio,
                headline,
                years_of_experience,
                current_job_title,
                current_company,
                skills:candidate_skills(skill_name, skill_level),
                experience:candidate_experience(
                  job_title,
                  company,
                  description,
                  start_date,
                  end_date,
                  is_current
                ),
                education:candidate_education(
                  degree,
                  field_of_study,
                  institution,
                  start_date,
                  end_date
                )
              ),
              job:jobs(
                id,
                job_title,
                description,
                requirements,
                responsibilities,
                required_skills,
                preferred_skills,
                experience_level,
                education_level
              )
            `)
            .eq('id', app.id)
            .single();

          if (fullApplication && fullApplication.candidate && fullApplication.job) {
            const analysis = await AIAnalysisService.analyzeCandidateCompatibility(
              fullApplication.candidate,
              fullApplication.job
            );

            await supabaseAdmin
              .from('job_applications')
              .update({
                ai_analysis_score: analysis.compatibility_score,
                ai_analysis_data: analysis,
                ai_analyzed_at: new Date().toISOString()
              })
              .eq('id', app.id);

            console.log(`✅ Re-analyzed application ${app.id}: ${analysis.compatibility_score}%`);
          }
        } catch (error) {
          console.error(`Error re-analyzing application ${app.id}:`, error);
        }
      });
    }
  } catch (error) {
    console.error('Error triggering re-analysis:', error);
  }
};

// ============================================
// RECRUITER PROFILE CONTROLLERS
// ============================================

/**
 * Get recruiter profile
 */
const getRecruiterProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('role', 'recruiter')
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    const { data: recruiterProfile, error: recruiterError } = await supabase
      .from('recruiter_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (recruiterError) {
      return res.json({
        profile: profile,
        recruiterProfile: null,
        message: 'Profile exists but recruiter details not completed'
      });
    }

    res.json({
      profile: profile,
      recruiterProfile: recruiterProfile
    });
  } catch (error) {
    console.error('Get recruiter profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get recruiter profile'
    });
  }
};

/**
 * Create or update recruiter profile
 */
/**
 * Create or update recruiter profile
 */
const createOrUpdateRecruiterProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Creating/updating recruiter profile for user:', userId);
    console.log('Request body:', req.body);
    console.log('Validated data:', req.validatedData);

    const {
      fullName,
      phoneNumber,
      companyName,
      companyLogoUrl,
      companyWebsite,
      companySize,
      industry,
      companyDescription,
      city,
      country,
      address,
      position
    } = req.validatedData;

    // Update main profile (faster - no check needed)
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // UPSERT recruiter profile (Update if exists, Insert if not)
    // Using upsert prevents race conditions and duplicate key errors
    console.log('Upserting recruiter profile');

    // Prepare data object with all fields
    const profileData = {
      user_id: userId,
      company_name: companyName,
      company_logo_url: companyLogoUrl || null,
      company_website: companyWebsite || null,
      company_size: companySize,
      industry: industry,
      company_description: companyDescription,
      position: position,
      country: country,
      city: city,
      address: address,
      updated_at: new Date().toISOString()
    };

    let recruiterProfile;

    try {
      // Primary attempt: UPSERT with all fields
      const { data, error } = await supabaseAdmin
        .from('recruiter_profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      recruiterProfile = data;

    } catch (err) {
      // Safe fallback: if column missing, try simplified UPSERT
      if (err.message && err.message.includes('column') && err.message.includes('does not exist')) {
        console.warn('Column missing in database, falling back to minimal upsert:', err.message);

        const minimalData = {
          user_id: userId,
          company_name: companyName,
          country: country,
          city: city,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseAdmin
          .from('recruiter_profiles')
          .upsert(minimalData, { onConflict: 'user_id' })
          .select()
          .single();

        if (error) throw error;
        recruiterProfile = data;
      } else {
        throw err;
      }
    }

    console.log('Recruiter profile saved successfully:', recruiterProfile.id);
    res.json({
      message: 'Recruiter profile saved successfully',
      recruiterProfile: recruiterProfile
    });
  } catch (error) {
    console.error('Create/Update recruiter profile error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    // Check for duplicate key error specifically
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Profile update conflict. Please try again.',
        details: error.detail
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to save recruiter profile',
      details: error.details || error.hint || 'Unknown error'
    });
  }
};

// ============================================
// CANDIDATE PROFILE CONTROLLERS
// ============================================

/**
 * Get candidate profile with all related data
 */
const getCandidateProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get base profile (use admin to bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('role', 'candidate')
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get candidate profile (use admin to bypass RLS)
    let { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If candidate profile doesn't exist, create it automatically
    if (!candidateProfile) {
      console.log(`Candidate profile not found for user ${userId}, creating automatically...`);

      const { data: newCandidateProfile, error: createError } = await supabaseAdmin
        .from('candidate_profiles')
        .insert({
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create candidate profile:', createError);
        return res.json({
          profile: profile,
          candidateProfile: null,
          skills: [],
          experience: [],
          projects: [],
          education: [],
          certifications: [],
          jobPreferences: null,
          message: 'Profile exists but candidate details not completed'
        });
      }

      candidateProfile = newCandidateProfile;
      console.log(`✅ Candidate profile created for user ${userId}`);
    }

    // Get all related data
    const [
      { data: skills },
      { data: experience },
      { data: projects },
      { data: education },
      { data: certifications },
      { data: jobPreferences }
    ] = await Promise.all([
      supabaseAdmin.from('candidate_skills').select('*').eq('candidate_id', candidateProfile.id),
      supabaseAdmin.from('candidate_experience').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_projects').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_education').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_certifications').select('*').eq('candidate_id', candidateProfile.id).order('issue_date', { ascending: false }),
      supabaseAdmin.from('candidate_job_preferences').select('*').eq('candidate_id', candidateProfile.id).single()
    ]);

    res.json({
      profile: profile,
      candidateProfile: candidateProfile,
      skills: skills || [],
      experience: experience || [],
      projects: projects || [],
      education: education || [],
      certifications: certifications || [],
      jobPreferences: jobPreferences || null
    });
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get candidate profile'
    });
  }
};

/**
 * Create or update candidate profile
 */
const createOrUpdateCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      phoneNumber,
      profilePictureUrl,
      headline,
      dateOfBirth,
      profileType,
      currentEducationStatus,
      expectedGraduationDate,
      yearsOfExperience,
      currentJobTitle,
      currentCompany,
      country,
      city,
      willingToRelocate,
      preferredWorkModes,
      bio,
      portfolioWebsite,
      linkedinUrl,
      githubUrl,
      behanceUrl
    } = req.validatedData;

    // Update main profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return res.status(500).json({
        error: 'Update Failed',
        message: 'Failed to update profile'
      });
    }

    // Check if candidate profile exists (optimized: only fetch ID)
    const { data: existing } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

    let candidateProfileId;

    if (existing) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('candidate_profiles')
        .update({
          headline,
          date_of_birth: dateOfBirth,
          profile_type: profileType,
          current_education_status: currentEducationStatus,
          expected_graduation_date: expectedGraduationDate,
          years_of_experience: yearsOfExperience,
          current_job_title: currentJobTitle,
          current_company: currentCompany,
          country,
          city,
          willing_to_relocate: willingToRelocate,
          preferred_work_modes: preferredWorkModes,
          bio,
          portfolio_website: portfolioWebsite,
          linkedin_url: linkedinUrl,
          github_url: githubUrl,
          behance_url: behanceUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select('id') // Only return ID for faster response
        .single();

      if (error) throw error;
      candidateProfileId = data.id;
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('candidate_profiles')
        .insert({
          user_id: userId,
          headline,
          date_of_birth: dateOfBirth,
          profile_type: profileType,
          current_education_status: currentEducationStatus,
          expected_graduation_date: expectedGraduationDate,
          years_of_experience: yearsOfExperience,
          current_job_title: currentJobTitle,
          current_company: currentCompany,
          country,
          city,
          willing_to_relocate: willingToRelocate,
          preferred_work_modes: preferredWorkModes,
          bio,
          portfolio_website: portfolioWebsite,
          linkedin_url: linkedinUrl,
          github_url: githubUrl,
          behance_url: behanceUrl
        })
        .select('id') // Only return ID for faster response
        .single();

      if (error) throw error;
      candidateProfileId = data.id;
    }

    // Send response immediately (don't wait for re-analysis)
    res.json({
      message: 'Candidate profile saved successfully',
      candidateProfile: { id: candidateProfileId }
    });

    // Trigger automatic re-analysis in background (non-blocking)
    // This allows the user to get instant feedback while analysis runs asynchronously
    if (candidateProfileId) {
      setImmediate(() => {
        triggerReAnalysisForCandidate(candidateProfileId).catch(err => {
          console.error('Background re-analysis failed (non-critical):', err);
        });
      });
    }
  } catch (error) {
    console.error('Create/Update candidate profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save candidate profile'
    });
  }
};

// ============================================
// CANDIDATE SKILLS CONTROLLERS
// ============================================

const addSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillName, skillLevel } = req.validatedData;

    // Get candidate profile id
    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found. Please complete your profile first.'
      });
    }

    // Check if skill already exists in verified skills
    const { data: existingVerified } = await supabase
      .from('candidate_skills')
      .select('id')
      .eq('candidate_id', candidateProfile.id)
      .ilike('skill_name', skillName)
      .single();

    if (existingVerified) {
      return res.status(400).json({
        error: 'Duplicate Skill',
        message: 'This skill already exists in your verified skills'
      });
    }

    // Check if skill already exists in unverified skills
    const { data: existingUnverified } = await supabase
      .from('unverified_skills')
      .select('id')
      .eq('candidate_id', candidateProfile.id)
      .ilike('skill_name', skillName)
      .single();

    if (existingUnverified) {
      return res.status(400).json({
        error: 'Duplicate Skill',
        message: 'This skill already exists in your unverified skills. Please verify it first.'
      });
    }

    // Add to unverified_skills table
    const { data, error } = await supabase
      .from('unverified_skills')
      .insert({
        candidate_id: candidateProfile.id,
        skill_name: skillName,
        skill_level: skillLevel
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({
          error: 'Duplicate Skill',
          message: 'This skill already exists in your profile'
        });
      }
      throw error;
    }

    res.status(201).json({
      message: 'Skill added to unverified list. Please verify it by taking an exam.',
      skill: data,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add skill'
    });
  }
};

const updateSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;
    const { skillName, skillLevel } = req.validatedData;

    // Get candidate profile id
    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Check if skill exists in verified skills
    const { data: verifiedSkill } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('id', skillId)
      .eq('candidate_id', candidateProfile.id)
      .single();

    if (verifiedSkill) {
      // If skill name or level changed, move to unverified and require re-verification
      if (verifiedSkill.skill_name !== skillName || verifiedSkill.skill_level !== skillLevel) {
        // Delete from verified
        await supabase
          .from('candidate_skills')
          .delete()
          .eq('id', skillId);

        // Add to unverified
        const { data: unverifiedSkill, error: unverifiedError } = await supabase
          .from('unverified_skills')
          .insert({
            candidate_id: candidateProfile.id,
            skill_name: skillName,
            skill_level: skillLevel
          })
          .select()
          .single();

        if (unverifiedError) throw unverifiedError;

        // Clear caches
        await clearSkillCaches(candidateProfile.id);

        return res.json({
          message: 'Skill updated. Please verify it again by taking an exam.',
          skill: unverifiedSkill,
          requiresVerification: true
        });
      } else {
        // No changes, return as is
        return res.json({
          message: 'Skill updated successfully',
          skill: verifiedSkill
        });
      }
    }

    // If not in verified, check unverified
    const { data: unverifiedSkill } = await supabase
      .from('unverified_skills')
      .select('*')
      .eq('id', skillId)
      .eq('candidate_id', candidateProfile.id)
      .single();

    if (unverifiedSkill) {
      // Update unverified skill
      const { data, error } = await supabase
        .from('unverified_skills')
        .update({
          skill_name: skillName,
          skill_level: skillLevel
        })
        .eq('id', skillId)
        .eq('candidate_id', candidateProfile.id)
        .select()
        .single();

      if (error) throw error;

      // Delete any existing exams for this skill (need to regenerate)
      await supabase
        .from('skill_verification_exams')
        .delete()
        .eq('unverified_skill_id', skillId);

      return res.json({
        message: 'Skill updated. Please verify it by taking an exam.',
        skill: data,
        requiresVerification: true
      });
    }

    return res.status(404).json({
      error: 'Not Found',
      message: 'Skill not found'
    });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update skill'
    });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillId } = req.params;

    // Get candidate profile id
    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Try to delete from verified skills
    const { error: verifiedError } = await supabase
      .from('candidate_skills')
      .delete()
      .eq('id', skillId)
      .eq('candidate_id', candidateProfile.id);

    // If not found in verified, try unverified
    if (verifiedError && verifiedError.code !== 'PGRST116') {
      const { error: unverifiedError } = await supabase
        .from('unverified_skills')
        .delete()
        .eq('id', skillId)
        .eq('candidate_id', candidateProfile.id);

      if (unverifiedError) throw unverifiedError;
    } else if (verifiedError) {
      // Try unverified if verified delete found nothing
      const { error: unverifiedError } = await supabase
        .from('unverified_skills')
        .delete()
        .eq('id', skillId)
        .eq('candidate_id', candidateProfile.id);

      if (unverifiedError && unverifiedError.code !== 'PGRST116') {
        throw unverifiedError;
      }
    }

    // Clear caches
    await clearSkillCaches(candidateProfile.id);

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.json({
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete skill'
    });
  }
};

// Helper function to clear skill-related caches
const clearSkillCaches = async (candidateId) => {
  await supabase
    .from('job_skill_analysis')
    .delete()
    .eq('candidate_id', candidateId);

  try {
    await supabase
      .from('job_skill_recommendations')
      .delete()
      .eq('candidate_id', candidateId);
  } catch (cacheError) {
    console.log('Recommendations cache not available for clearing:', cacheError.message);
  }

  await supabase
    .from('candidate_learning_roadmaps')
    .delete()
    .eq('candidate_id', candidateId);
};

// Get unverified skills
const getUnverifiedSkills = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    const { data: unverifiedSkills, error } = await supabase
      .from('unverified_skills')
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      unverifiedSkills: unverifiedSkills || []
    });
  } catch (error) {
    console.error('Get unverified skills error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch unverified skills'
    });
  }
};

// Generate exam for skill verification
const generateSkillExam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unverifiedSkillId } = req.params;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get unverified skill
    const { data: unverifiedSkill, error: skillError } = await supabase
      .from('unverified_skills')
      .select('*')
      .eq('id', unverifiedSkillId)
      .eq('candidate_id', candidateProfile.id)
      .single();

    if (skillError || !unverifiedSkill) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Unverified skill not found'
      });
    }

    // Check if exam already exists and is still valid (not expired)
    const { data: existingExam } = await supabase
      .from('skill_verification_exams')
      .select('*')
      .eq('unverified_skill_id', unverifiedSkillId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingExam) {
      // Return exam WITH correct answers for instant client-side evaluation
      const examForUser = existingExam.questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer, // Include for instant evaluation
        explanation: q.explanation
      }));

      return res.json({
        message: 'Exam retrieved successfully',
        exam: {
          id: existingExam.id,
          questions: examForUser,
          totalMarks: existingExam.total_marks,
          passingMarks: existingExam.passing_marks,
          skillName: existingExam.skill_name,
          skillLevel: existingExam.skill_level
        }
      });
    }

    // Generate new exam using AI
    const questions = await AIAnalysisService.generateSkillVerificationExam(
      unverifiedSkill.skill_name,
      unverifiedSkill.skill_level
    );

    // Save exam to database (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: exam, error: examError } = await supabase
      .from('skill_verification_exams')
      .insert({
        unverified_skill_id: unverifiedSkillId,
        questions: questions,
        total_marks: 10,
        passing_marks: 7,
        skill_name: unverifiedSkill.skill_name,
        skill_level: unverifiedSkill.skill_level,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (examError) throw examError;

    // Return exam WITH correct answers for instant client-side evaluation
    const examForUser = questions.map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer, // Include for instant evaluation
      explanation: q.explanation
    }));

    res.json({
      message: 'Exam generated successfully',
      exam: {
        id: exam.id,
        questions: examForUser,
        totalMarks: exam.total_marks,
        passingMarks: exam.passing_marks,
        skillName: exam.skill_name,
        skillLevel: exam.skill_level
      }
    });
  } catch (error) {
    console.error('Generate exam error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate exam'
    });
  }
};

// Submit exam and verify skill
const submitSkillExam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { examId, answers } = req.body;

    if (!examId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Exam ID and answers array are required'
      });
    }

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get exam
    const { data: exam, error: examError } = await supabase
      .from('skill_verification_exams')
      .select('*, unverified_skills!inner(*)')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Exam not found or expired'
      });
    }

    // Verify the exam belongs to this candidate
    if (exam.unverified_skills.candidate_id !== candidateProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to submit this exam'
      });
    }

    // Evaluate answers
    const evaluation = AIAnalysisService.evaluateExamAnswers(exam.questions, answers);

    // Save attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('skill_verification_attempts')
      .insert({
        exam_id: examId,
        unverified_skill_id: exam.unverified_skill_id,
        candidate_id: candidateProfile.id,
        answers: answers,
        score: evaluation.score,
        total_marks: evaluation.totalMarks,
        passed: evaluation.passed,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // If passed, move skill to verified skills
    if (evaluation.passed) {
      // Delete from unverified
      await supabase
        .from('unverified_skills')
        .delete()
        .eq('id', exam.unverified_skill_id);

      // Add to verified
      const { data: verifiedSkill, error: verifyError } = await supabase
        .from('candidate_skills')
        .insert({
          candidate_id: candidateProfile.id,
          skill_name: exam.skill_name,
          skill_level: exam.skill_level
        })
        .select()
        .single();

      if (verifyError) throw verifyError;

      // Send response immediately (don't wait for cache clear and re-analysis)
      const response = {
        message: 'Congratulations! Skill verified successfully.',
        passed: true,
        score: evaluation.score,
        totalMarks: evaluation.totalMarks,
        percentage: evaluation.percentage,
        results: evaluation.results,
        verifiedSkill: verifiedSkill
      };

      res.json(response);

      // Clear caches and trigger re-analysis in background (non-blocking)
      setImmediate(async () => {
        try {
          await clearSkillCaches(candidateProfile.id);
          await triggerReAnalysisForCandidate(candidateProfile.id);
        } catch (err) {
          console.error('Background cache clear/re-analysis failed (non-critical):', err);
        }
      });

      return; // Exit early since we already sent response
    } else {
      // Failed - return results but don't verify
      return res.json({
        message: 'You did not pass the exam. Please try again.',
        passed: false,
        score: evaluation.score,
        totalMarks: evaluation.totalMarks,
        percentage: evaluation.percentage,
        results: evaluation.results,
        canRetry: true
      });
    }
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to submit exam'
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format date for database - Joi.date() may convert strings to Date objects
// Supabase DATE columns need YYYY-MM-DD string format
const formatDateForDB = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
  }
  if (typeof date === 'string') {
    // If already a string, ensure it's in YYYY-MM-DD format
    return date.split('T')[0]; // Remove time part if present
  }
  return date;
};

// ============================================
// CANDIDATE EXPERIENCE CONTROLLERS
// ============================================

const addExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceType, jobTitle, company, location, startDate, endDate, isCurrent, description } = req.validatedData;

    console.log('Add experience - Received data:', { experienceType, jobTitle, company, location, startDate, endDate, isCurrent, description });

    const { data: candidateProfile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching candidate profile:', profileError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch candidate profile',
        details: profileError.message
      });
    }

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    console.log('Candidate profile ID:', candidateProfile.id);

    // Prepare data for insertion - ensure dates are strings in YYYY-MM-DD format
    const insertData = {
      candidate_id: candidateProfile.id,
      experience_type: experienceType,
      job_title: jobTitle,
      company: company,
      location: location || null,
      start_date: formatDateForDB(startDate),
      end_date: formatDateForDB(endDate),
      is_current: isCurrent !== undefined ? Boolean(isCurrent) : false,
      description: description || null
    };

    console.log('Insert data:', insertData);

    const { data, error } = await supabaseAdmin
      .from('candidate_experience')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to insert experience',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.status(201).json({
      message: 'Experience added successfully',
      experience: data
    });
  } catch (error) {
    console.error('Add experience error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add experience',
      details: error.message || String(error)
    });
  }
};

const updateExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    const { experienceType, jobTitle, company, location, startDate, endDate, isCurrent, description } = req.validatedData;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('candidate_experience')
      .update({
        experience_type: experienceType,
        job_title: jobTitle,
        company,
        location: location || null,
        start_date: formatDateForDB(startDate),
        end_date: formatDateForDB(endDate),
        is_current: isCurrent !== undefined ? Boolean(isCurrent) : false,
        description: description || null
      })
      .eq('id', experienceId)
      .eq('candidate_id', candidateProfile.id)
      .select()
      .single();

    if (error) throw error;

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.json({
      message: 'Experience updated successfully',
      experience: data
    });
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update experience'
    });
  }
};

const deleteExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { error } = await supabaseAdmin
      .from('candidate_experience')
      .delete()
      .eq('id', experienceId)
      .eq('candidate_id', candidateProfile.id);

    if (error) throw error;

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.json({
      message: 'Experience deleted successfully'
    });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete experience'
    });
  }
};

// ============================================
// CANDIDATE PROJECTS CONTROLLERS
// ============================================

const addProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectTitle, projectType, organization, startDate, endDate, isOngoing, description, projectUrl, technologiesUsed } = req.validatedData;

    console.log('Add project - Received data:', { projectTitle, projectType, organization, startDate, endDate, isOngoing, description, projectUrl, technologiesUsed });

    const { data: candidateProfile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching candidate profile:', profileError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch candidate profile',
        details: profileError.message
      });
    }

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    console.log('Candidate profile ID:', candidateProfile.id);

    const insertData = {
      candidate_id: candidateProfile.id,
      project_title: projectTitle,
      project_type: projectType,
      organization: organization || null,
      start_date: formatDateForDB(startDate),
      end_date: formatDateForDB(endDate),
      is_ongoing: isOngoing !== undefined ? Boolean(isOngoing) : false,
      description: description,
      project_url: projectUrl || null,
      technologies_used: technologiesUsed || null
    };

    console.log('Insert data:', insertData);

    const { data, error } = await supabaseAdmin
      .from('candidate_projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to insert project',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    res.status(201).json({
      message: 'Project added successfully',
      project: data
    });
  } catch (error) {
    console.error('Add project error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add project',
      details: error.message || String(error)
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { projectTitle, projectType, organization, startDate, endDate, isOngoing, description, projectUrl, technologiesUsed } = req.validatedData;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('candidate_projects')
      .update({
        project_title: projectTitle,
        project_type: projectType,
        organization: organization || null,
        start_date: formatDateForDB(startDate),
        end_date: formatDateForDB(endDate),
        is_ongoing: isOngoing !== undefined ? Boolean(isOngoing) : false,
        description: description,
        project_url: projectUrl || null,
        technologies_used: technologiesUsed || null
      })
      .eq('id', projectId)
      .eq('candidate_id', candidateProfile.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Project updated successfully',
      project: data
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update project'
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { error } = await supabaseAdmin
      .from('candidate_projects')
      .delete()
      .eq('id', projectId)
      .eq('candidate_id', candidateProfile.id);

    if (error) throw error;

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete project'
    });
  }
};

// ============================================
// CANDIDATE EDUCATION CONTROLLERS
// ============================================

const addEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { educationType, degree, fieldOfStudy, institution, startDate, endDate, isCurrent, grade, achievements } = req.validatedData;

    console.log('Add education - Received data:', { educationType, degree, fieldOfStudy, institution, startDate, endDate, isCurrent, grade, achievements });

    const { data: candidateProfile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching candidate profile:', profileError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch candidate profile',
        details: profileError.message
      });
    }

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    console.log('Candidate profile ID:', candidateProfile.id);

    const insertData = {
      candidate_id: candidateProfile.id,
      education_type: educationType,
      degree: degree,
      field_of_study: fieldOfStudy,
      institution: institution,
      start_date: formatDateForDB(startDate),
      end_date: formatDateForDB(endDate),
      is_current: isCurrent !== undefined ? Boolean(isCurrent) : false,
      grade: grade || null,
      achievements: achievements || null
    };

    console.log('Insert data:', insertData);

    const { data, error } = await supabaseAdmin
      .from('candidate_education')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to insert education',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.status(201).json({
      message: 'Education added successfully',
      education: data
    });
  } catch (error) {
    console.error('Add education error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add education',
      details: error.message || String(error)
    });
  }
};

const updateEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { educationId } = req.params;
    const { educationType, degree, fieldOfStudy, institution, startDate, endDate, isCurrent, grade, achievements } = req.validatedData;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('candidate_education')
      .update({
        education_type: educationType,
        degree: degree,
        field_of_study: fieldOfStudy,
        institution: institution,
        start_date: formatDateForDB(startDate),
        end_date: formatDateForDB(endDate),
        is_current: isCurrent !== undefined ? Boolean(isCurrent) : false,
        grade: grade || null,
        achievements: achievements || null
      })
      .eq('id', educationId)
      .eq('candidate_id', candidateProfile.id)
      .select()
      .single();

    if (error) throw error;

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.json({
      message: 'Education updated successfully',
      education: data
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update education'
    });
  }
};

const deleteEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { educationId } = req.params;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { error } = await supabaseAdmin
      .from('candidate_education')
      .delete()
      .eq('id', educationId)
      .eq('candidate_id', candidateProfile.id);

    if (error) throw error;

    // Trigger re-analysis for all active applications
    triggerReAnalysisForCandidate(candidateProfile.id);

    res.json({
      message: 'Education deleted successfully'
    });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete education'
    });
  }
};

// ============================================
// CANDIDATE CERTIFICATIONS CONTROLLERS
// ============================================

const addCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certificationName, issuingOrganization, issueDate, expiryDate, doesNotExpire, credentialId, credentialUrl } = req.validatedData;

    console.log('Add certification - Received data:', { certificationName, issuingOrganization, issueDate, expiryDate, doesNotExpire, credentialId, credentialUrl });

    const { data: candidateProfile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching candidate profile:', profileError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch candidate profile',
        details: profileError.message
      });
    }

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    console.log('Candidate profile ID:', candidateProfile.id);

    const insertData = {
      candidate_id: candidateProfile.id,
      certification_name: certificationName,
      issuing_organization: issuingOrganization,
      issue_date: formatDateForDB(issueDate),
      expiry_date: doesNotExpire ? null : formatDateForDB(expiryDate),
      does_not_expire: doesNotExpire !== undefined ? Boolean(doesNotExpire) : false,
      credential_id: credentialId || null,
      credential_url: credentialUrl || null
    };

    console.log('Insert data:', insertData);

    const { data, error } = await supabaseAdmin
      .from('candidate_certifications')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to insert certification',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    res.status(201).json({
      message: 'Certification added successfully',
      certification: data
    });
  } catch (error) {
    console.error('Add certification error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add certification',
      details: error.message || String(error)
    });
  }
};

const updateCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certificationId } = req.params;
    const { certificationName, issuingOrganization, issueDate, expiryDate, doesNotExpire, credentialId, credentialUrl } = req.validatedData;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('candidate_certifications')
      .update({
        certification_name: certificationName,
        issuing_organization: issuingOrganization,
        issue_date: formatDateForDB(issueDate),
        expiry_date: doesNotExpire ? null : formatDateForDB(expiryDate),
        does_not_expire: doesNotExpire !== undefined ? Boolean(doesNotExpire) : false,
        credential_id: credentialId || null,
        credential_url: credentialUrl || null
      })
      .eq('id', certificationId)
      .eq('candidate_id', candidateProfile.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Certification updated successfully',
      certification: data
    });
  } catch (error) {
    console.error('Update certification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update certification',
      details: error.message || String(error)
    });
  }
};

const deleteCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certificationId } = req.params;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { error } = await supabaseAdmin
      .from('candidate_certifications')
      .delete()
      .eq('id', certificationId)
      .eq('candidate_id', candidateProfile.id);

    if (error) throw error;

    res.json({
      message: 'Certification deleted successfully'
    });
  } catch (error) {
    console.error('Delete certification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete certification'
    });
  }
};

// ============================================
// CANDIDATE JOB PREFERENCES CONTROLLERS
// ============================================

const createOrUpdateJobPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lookingFor, preferredRoles, preferredCountries, expectedSalaryMin, expectedSalaryMax, salaryCurrency, availableFrom, noticePeriod } = req.validatedData;

    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('candidate_job_preferences')
      .select('id')
      .eq('candidate_id', candidateProfile.id)
      .single();

    let jobPreferences;

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('candidate_job_preferences')
        .update({
          looking_for: lookingFor,
          preferred_roles: preferredRoles,
          preferred_countries: preferredCountries,
          expected_salary_min: expectedSalaryMin,
          expected_salary_max: expectedSalaryMax,
          salary_currency: salaryCurrency,
          available_from: availableFrom,
          notice_period: noticePeriod
        })
        .eq('candidate_id', candidateProfile.id)
        .select()
        .single();

      if (error) throw error;
      jobPreferences = data;
    } else {
      // Create
      const { data, error } = await supabase
        .from('candidate_job_preferences')
        .insert({
          candidate_id: candidateProfile.id,
          looking_for: lookingFor,
          preferred_roles: preferredRoles,
          preferred_countries: preferredCountries,
          expected_salary_min: expectedSalaryMin,
          expected_salary_max: expectedSalaryMax,
          salary_currency: salaryCurrency,
          available_from: availableFrom,
          notice_period: noticePeriod
        })
        .select()
        .single();

      if (error) throw error;
      jobPreferences = data;
    }

    res.json({
      message: 'Job preferences saved successfully',
      jobPreferences
    });
  } catch (error) {
    console.error('Create/Update job preferences error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save job preferences'
    });
  }
};

/**
 * Upload resume file and extract profile data using Gemini API
 */
const uploadAndParseResume = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    const fileType = file.mimetype;
    const fileName = file.originalname;

    // Validate file type
    if (fileType !== 'application/pdf' &&
      fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Only PDF and DOCX files are supported'
      });
    }

    // Check if candidate profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    // If profile exists, just save the resume file and return
    if (existingProfile && !profileCheckError) {
      const resumeData = file.buffer.toString('base64');

      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update({
          resume_file: resumeData,
          resume_filename: fileName,
          resume_filetype: fileType,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error saving resume:', updateError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to save resume'
        });
      }

      return res.json({
        message: 'Resume uploaded successfully. Profile already exists, so only the resume file was updated.',
        data: {
          filename: fileName,
          filetype: fileType,
          profileExists: true
        }
      });
    }

    // Extract text from CV
    let cvText = '';

    try {
      if (fileType === 'application/pdf') {
        const pdfData = await pdfParse(file.buffer);
        cvText = pdfData.text;
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        cvText = result.value;
      }
    } catch (parseError) {
      console.error('Error parsing CV:', parseError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to parse CV file'
      });
    }

    if (!cvText || cvText.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Could not extract text from CV. Please ensure the file is not empty or corrupted.'
      });
    }

    // Use Gemini API to extract profile information
    const axios = require('axios');
    const GEMINI_API_KEY = 'AIzaSyAjSBdJTSHrF3zqPYMmuMDCOt4sF4N7gnk';

    const prompt = `Extract structured information from this CV/resume and return ONLY a valid JSON object (no markdown, no code blocks, no extra text). The JSON should have this exact structure:

{
  "bio": "A brief professional summary (2-3 sentences)",
  "headline": "Professional title or role",
  "phone": "Phone number if available",
  "city": "City name",
  "country": "Country name",
  "years_of_experience": number (estimated total years),
  "current_job_title": "Most recent job title",
  "current_company": "Most recent company name",
  "linkedin_url": "LinkedIn URL if mentioned",
  "github_url": "GitHub URL if mentioned",
  "portfolio_website": "Portfolio or personal website if mentioned",
  "skills": [
    {"skill_name": "skill", "skill_level": "Beginner|Intermediate|Advanced|Expert"}
  ],
  "experience": [
    {
      "job_title": "title",
      "company": "company name",
      "description": "job description",
      "start_date": "YYYY-MM-DD or YYYY-MM",
      "end_date": "YYYY-MM-DD or YYYY-MM or null if current",
      "is_current": boolean
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "field_of_study": "major/field",
      "institution": "school/university name",
      "start_date": "YYYY-MM-DD or YYYY-MM",
      "end_date": "YYYY-MM-DD or YYYY-MM or null if current"
    }
  ],
  "projects": [
    {
      "title": "project name",
      "description": "project description",
      "technologies": "technologies used",
      "start_date": "YYYY-MM-DD or YYYY-MM",
      "end_date": "YYYY-MM-DD or YYYY-MM or null if ongoing"
    }
  ],
  "certifications": [
    {
      "name": "certification name",
      "issuing_organization": "organization",
      "issue_date": "YYYY-MM-DD or YYYY-MM",
      "expiry_date": "YYYY-MM-DD or YYYY-MM or null if no expiry"
    }
  ]
}

CV Text:
${cvText}

Return ONLY the JSON object, nothing else.`;

    let geminiResponse;
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          }
        }
      );

      const generatedText = response.data.candidates[0].content.parts[0].text;

      // Remove markdown code blocks if present
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      geminiResponse = JSON.parse(cleanedText);

    } catch (geminiError) {
      console.error('Gemini API error:', geminiError.response?.data || geminiError.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to analyze CV with AI. Please try again or enter details manually.'
      });
    }

    // Create candidate profile
    const resumeData = file.buffer.toString('base64');

    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('candidate_profiles')
      .insert({
        user_id: userId,
        bio: geminiResponse.bio || null,
        headline: geminiResponse.headline || null,
        phone: geminiResponse.phone || null,
        city: geminiResponse.city || null,
        country: geminiResponse.country || null,
        years_of_experience: geminiResponse.years_of_experience || 0,
        current_job_title: geminiResponse.current_job_title || null,
        current_company: geminiResponse.current_company || null,
        linkedin_url: geminiResponse.linkedin_url || null,
        github_url: geminiResponse.github_url || null,
        portfolio_website: geminiResponse.portfolio_website || null,
        resume_file: resumeData,
        resume_filename: fileName,
        resume_filetype: fileType
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create profile'
      });
    }

    // Add skills
    if (geminiResponse.skills && geminiResponse.skills.length > 0) {
      const skillsToInsert = geminiResponse.skills.map(skill => ({
        candidate_id: newProfile.id,
        skill_name: skill.skill_name,
        skill_level: skill.skill_level || 'Intermediate'
      }));

      await supabaseAdmin.from('candidate_skills').insert(skillsToInsert);
    }

    // Add experience
    if (geminiResponse.experience && geminiResponse.experience.length > 0) {
      const experienceToInsert = geminiResponse.experience.map(exp => ({
        candidate_id: newProfile.id,
        job_title: exp.job_title,
        company: exp.company,
        description: exp.description,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current || false
      }));

      await supabaseAdmin.from('candidate_experience').insert(experienceToInsert);
    }

    // Add education
    if (geminiResponse.education && geminiResponse.education.length > 0) {
      const educationToInsert = geminiResponse.education.map(edu => ({
        candidate_id: newProfile.id,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        institution: edu.institution,
        start_date: edu.start_date,
        end_date: edu.end_date
      }));

      await supabaseAdmin.from('candidate_education').insert(educationToInsert);
    }

    // Add projects
    if (geminiResponse.projects && geminiResponse.projects.length > 0) {
      const projectsToInsert = geminiResponse.projects.map(proj => ({
        candidate_id: newProfile.id,
        title: proj.title,
        description: proj.description,
        technologies: proj.technologies,
        start_date: proj.start_date,
        end_date: proj.end_date
      }));

      await supabaseAdmin.from('candidate_projects').insert(projectsToInsert);
    }

    // Add certifications
    if (geminiResponse.certifications && geminiResponse.certifications.length > 0) {
      const certificationsToInsert = geminiResponse.certifications.map(cert => ({
        candidate_id: newProfile.id,
        name: cert.name,
        issuing_organization: cert.issuing_organization,
        issue_date: cert.issue_date,
        expiry_date: cert.expiry_date
      }));

      await supabaseAdmin.from('candidate_certifications').insert(certificationsToInsert);
    }

    res.json({
      message: 'Profile created successfully from CV',
      data: {
        profile: newProfile,
        extractedData: geminiResponse
      }
    });

  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload resume'
    });
  }
};

/**
 * Download resume file
 */
const downloadResume = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Get candidate profile with resume
    const { data: candidateProfile, error } = await supabase
      .from('candidate_profiles')
      .select('resume_file, resume_filename, resume_filetype')
      .eq('id', candidateId)
      .single();

    if (error || !candidateProfile || !candidateProfile.resume_file) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Resume not found'
      });
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(candidateProfile.resume_file, 'base64');

    // Set appropriate headers
    res.setHeader('Content-Type', candidateProfile.resume_filetype);
    res.setHeader('Content-Disposition', `attachment; filename="${candidateProfile.resume_filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to download resume'
    });
  }
};

module.exports = {
  getRecruiterProfile,
  createOrUpdateRecruiterProfile,
  getCandidateProfile,
  createOrUpdateCandidateProfile,
  addSkill,
  updateSkill,
  deleteSkill,
  getUnverifiedSkills,
  generateSkillExam,
  submitSkillExam,
  addExperience,
  updateExperience,
  deleteExperience,
  addProject,
  updateProject,
  deleteProject,
  addEducation,
  updateEducation,
  deleteEducation,
  addCertification,
  updateCertification,
  deleteCertification,
  createOrUpdateJobPreferences,
  uploadAndParseResume,
  downloadResume
};

