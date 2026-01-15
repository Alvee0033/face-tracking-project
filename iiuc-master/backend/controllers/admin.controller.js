const { supabase, supabaseAdmin } = require('../config/supabase');
const AIAnalysisService = require('../services/aiAnalysis.service');

/**
 * Register a new admin user (protected endpoint - should be called manually)
 */
const registerAdmin = async (req, res) => {
  try {
    const { email, password, fullName } = req.validatedData;

    // Create auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        full_name: fullName,
        role: 'admin'
      }
    });

    if (authError) {
      return res.status(400).json({
        error: 'Admin Registration Failed',
        message: authError.message
      });
    }

    if (!authData || !authData.user) {
      return res.status(500).json({
        error: 'Admin Registration Failed',
        message: 'Failed to create auth user'
      });
    }

    // Create profile with admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        role: 'admin',
        full_name: fullName,
        email: email
      })
      .select()
      .single();

    if (profileError) {
      console.error('Admin profile creation error:', profileError);
      // Try to delete the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Error cleaning up auth user:', deleteError);
      }
      return res.status(500).json({
        error: 'Profile Creation Failed',
        message: 'Admin user created but profile setup failed'
      });
    }

    // Create admin profile
    const { error: adminProfileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        user_id: authData.user.id,
        admin_level: 'super_admin'
      });

    if (adminProfileError) {
      console.error('Admin profile creation error:', adminProfileError);
      // Non-critical error, continue
    }

    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin',
        fullName: fullName
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create admin user',
      details: error.message
    });
  }
};

/**
 * Get dashboard analytics
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    // Get number of users analyzed (candidates with AI analysis)
    const { data: analyzedUsers, error: analyzedError } = await supabaseAdmin
      .from('job_applications')
      .select('candidate_id, ai_analyzed_at')
      .not('ai_analyzed_at', 'is', null);

    const uniqueAnalyzedUsers = analyzedUsers 
      ? new Set(analyzedUsers.map(app => app.candidate_id)).size 
      : 0;

    // Get total number of job applications (jobs suggested/applied)
    const { count: totalApplications, error: applicationsError } = await supabaseAdmin
      .from('job_applications')
      .select('*', { count: 'exact', head: true });

    // Get skills most in demand (from job_skills)
    const { data: jobSkills, error: skillsError } = await supabaseAdmin
      .from('job_skills')
      .select('skill_name');

    // Count skill frequency
    const skillFrequency = {};
    if (jobSkills) {
      jobSkills.forEach(skill => {
        const skillName = skill.skill_name.toLowerCase().trim();
        skillFrequency[skillName] = (skillFrequency[skillName] || 0) + 1;
      });
    }

    // Get top 10 most in-demand skills
    const topSkills = Object.entries(skillFrequency)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get common gaps from AI analysis data
    const { data: analysisData, error: analysisError } = await supabaseAdmin
      .from('job_applications')
      .select('ai_analysis_data')
      .not('ai_analysis_data', 'is', null)
      .limit(1000); // Limit for performance

    // Extract common gaps from AI analysis
    const gapFrequency = {};
    if (analysisData) {
      analysisData.forEach(app => {
        if (app.ai_analysis_data) {
          // Check for missing_skills or gaps in the analysis data
          const missingSkills = app.ai_analysis_data.missing_skills || 
                                app.ai_analysis_data.gaps?.map(g => g.skill) || 
                                app.ai_analysis_data.skill_gaps || [];
          
          missingSkills.forEach(skill => {
            const skillName = typeof skill === 'string' 
              ? skill.toLowerCase().trim() 
              : (skill.skill || skill.name || '').toLowerCase().trim();
            
            if (skillName) {
              gapFrequency[skillName] = (gapFrequency[skillName] || 0) + 1;
            }
          });
        }
      });
    }

    // Also check job_skill_analysis table for missing skills
    const { data: skillAnalysis, error: skillAnalysisError } = await supabaseAdmin
      .from('job_skill_analysis')
      .select('missing_skills')
      .limit(1000);

    if (skillAnalysis) {
      skillAnalysis.forEach(analysis => {
        if (analysis.missing_skills && Array.isArray(analysis.missing_skills)) {
          analysis.missing_skills.forEach(skill => {
            const skillName = typeof skill === 'string' 
              ? skill.toLowerCase().trim() 
              : (skill.skill || skill.name || '').toLowerCase().trim();
            
            if (skillName) {
              gapFrequency[skillName] = (gapFrequency[skillName] || 0) + 1;
            }
          });
        }
      });
    }

    // Get top 10 common gaps
    const commonGaps = Object.entries(gapFrequency)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Additional statistics
    const { count: totalCandidates } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalJobs } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    const { count: activeJobs } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalRecruiters } = await supabaseAdmin
      .from('recruiter_profiles')
      .select('*', { count: 'exact', head: true });

    // Get average AI analysis score
    const { data: scores } = await supabaseAdmin
      .from('job_applications')
      .select('ai_analysis_score')
      .not('ai_analysis_score', 'is', null);

    const avgScore = scores && scores.length > 0
      ? scores.reduce((sum, app) => sum + (app.ai_analysis_score || 0), 0) / scores.length
      : 0;

    res.json({
      success: true,
      data: {
        usersAnalyzed: uniqueAnalyzedUsers,
        totalCandidates: totalCandidates || 0,
        totalRecruiters: totalRecruiters || 0,
        jobsSuggested: totalApplications || 0,
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        skillsMostInDemand: topSkills,
        commonGaps: commonGaps,
        averageAnalysisScore: Math.round(avgScore * 100) / 100,
        totalAnalyses: scores?.length || 0
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard analytics',
      details: error.message
    });
  }
};

/**
 * Get detailed analytics with AI insights
 */
const getDetailedAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get recent analyses
    const { data: recentAnalyses } = await supabaseAdmin
      .from('job_applications')
      .select('ai_analysis_data, ai_analysis_score, ai_analyzed_at')
      .not('ai_analysis_data', 'is', null)
      .gte('ai_analyzed_at', daysAgo.toISOString())
      .limit(500);

    // Use AI to generate insights
    let aiInsights = null;
    if (recentAnalyses && recentAnalyses.length > 0) {
      try {
        const analysisSummary = {
          totalAnalyses: recentAnalyses.length,
          averageScore: recentAnalyses.reduce((sum, a) => sum + (a.ai_analysis_score || 0), 0) / recentAnalyses.length,
          scoreDistribution: {
            high: recentAnalyses.filter(a => (a.ai_analysis_score || 0) >= 80).length,
            medium: recentAnalyses.filter(a => (a.ai_analysis_score || 0) >= 50 && (a.ai_analysis_score || 0) < 80).length,
            low: recentAnalyses.filter(a => (a.ai_analysis_score || 0) < 50).length
          }
        };

        aiInsights = await AIAnalysisService.generateAdminInsights(analysisSummary);
      } catch (aiError) {
        console.error('AI insights generation error:', aiError);
      }
    }

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        recentAnalyses: recentAnalyses?.length || 0,
        aiInsights: aiInsights
      }
    });
  } catch (error) {
    console.error('Detailed analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch detailed analytics'
    });
  }
};

module.exports = {
  registerAdmin,
  getDashboardAnalytics,
  getDetailedAnalytics
};

