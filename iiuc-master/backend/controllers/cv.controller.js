const { supabase, supabaseAdmin } = require('../config/supabase');
const AIAnalysisService = require('../services/aiAnalysis.service');

/**
 * Get full candidate profile data for CV generation
 */
const getCandidateProfileForCV = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Profile not found'
      });
    }

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get all related data
    const [
      { data: skills },
      { data: experience },
      { data: projects },
      { data: education },
      { data: certifications }
    ] = await Promise.all([
      supabaseAdmin.from('candidate_skills').select('*').eq('candidate_id', candidateProfile.id).order('created_at', { ascending: false }),
      supabaseAdmin.from('candidate_experience').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_projects').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_education').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_certifications').select('*').eq('candidate_id', candidateProfile.id).order('issue_date', { ascending: false })
    ]);

    res.json({
      profile: {
        ...profile,
        ...candidateProfile
      },
      skills: skills || [],
      experience: experience || [],
      projects: projects || [],
      education: education || [],
      certifications: certifications || []
    });
  } catch (error) {
    console.error('Get CV profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get profile data'
    });
  }
};

/**
 * Generate professional summary using AI
 */
const generateProfessionalSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get related data
    const [
      { data: skills },
      { data: experience },
      { data: education }
    ] = await Promise.all([
      supabaseAdmin.from('candidate_skills').select('*').eq('candidate_id', candidateProfile.id),
      supabaseAdmin.from('candidate_experience').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false }),
      supabaseAdmin.from('candidate_education').select('*').eq('candidate_id', candidateProfile.id).order('start_date', { ascending: false })
    ]);

    const profileData = {
      headline: candidateProfile.headline,
      bio: candidateProfile.bio,
      yearsOfExperience: candidateProfile.years_of_experience,
      currentJobTitle: candidateProfile.current_job_title,
      currentCompany: candidateProfile.current_company,
      skills: skills || [],
      experience: experience || [],
      education: education || []
    };

    const summary = await AIAnalysisService.generateProfessionalSummary(profileData);

    res.json({
      summary
    });
  } catch (error) {
    console.error('Generate professional summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate professional summary'
    });
  }
};

/**
 * Enhance bullet points for experience/projects
 */
const enhanceBulletPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body; // 'experience' or 'projects'

    if (!type || !['experience', 'projects'].includes(type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Type must be "experience" or "projects"'
      });
    }

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
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

    // Get experience or projects
    const tableName = type === 'experience' ? 'candidate_experience' : 'candidate_projects';
    const { data: items, error: itemsError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .order('start_date', { ascending: false });

    if (itemsError) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch items'
      });
    }

    const enhancedItems = await AIAnalysisService.enhanceBulletPoints(items || []);

    res.json({
      items: enhancedItems
    });
  } catch (error) {
    console.error('Enhance bullet points error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to enhance bullet points'
    });
  }
};

/**
 * Generate profile recommendations
 */
const generateRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get related data
    const [
      { data: skills },
      { data: experience },
      { data: projects }
    ] = await Promise.all([
      supabaseAdmin.from('candidate_skills').select('*').eq('candidate_id', candidateProfile.id),
      supabaseAdmin.from('candidate_experience').select('*').eq('candidate_id', candidateProfile.id),
      supabaseAdmin.from('candidate_projects').select('*').eq('candidate_id', candidateProfile.id)
    ]);

    const profileData = {
      linkedin_url: candidateProfile.linkedin_url,
      github_url: candidateProfile.github_url,
      portfolio_website: candidateProfile.portfolio_website,
      behance_url: candidateProfile.behance_url,
      bio: candidateProfile.bio,
      headline: candidateProfile.headline,
      skills: skills || [],
      experience: experience || [],
      projects: projects || []
    };

    const recommendations = await AIAnalysisService.generateProfileRecommendations(profileData);

    res.json({
      recommendations
    });
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate recommendations'
    });
  }
};

module.exports = {
  getCandidateProfileForCV,
  generateProfessionalSummary,
  enhanceBulletPoints,
  generateRecommendations
};

