const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profile.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Try to load headshot controller, but make it optional (requires sharp which may fail)
let headshotController = null;
let headshotControllerError = null;

function getHeadshotController() {
  if (headshotController) return headshotController;
  if (headshotControllerError) {
    return {
      generateHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      getHeadshotHistory: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      deleteHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' })
    };
  }
  
  try {
    headshotController = require('../controllers/headshot.controller');
    return headshotController;
  } catch (error) {
    console.warn('⚠️  Headshot controller not available in profile routes:', error.message);
    headshotControllerError = error;
    return {
      generateHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      getHeadshotHistory: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      deleteHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' })
    };
  }
}

const { validate } = require('../middleware/validate.middleware');
const {
  recruiterProfileSchema,
  candidateProfileSchema,
  skillSchema,
  experienceSchema,
  projectSchema,
  educationSchema,
  certificationSchema,
  jobPreferencesSchema
} = require('../validators/profile.validator');

// Configure multer for resume uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// Configure multer for image uploads (headshots)
const imageStorage = multer.memoryStorage();
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// ============================================
// RECRUITER PROFILE ROUTES
// ============================================

// GET /api/v1/profiles/recruiter/:userId - Get recruiter profile
router.get('/recruiter/:userId', profileController.getRecruiterProfile);

// POST /api/v1/profiles/recruiter - Create/Update recruiter profile
router.post(
  '/recruiter',
  authenticate,
  authorize('recruiter'),
  validate(recruiterProfileSchema),
  profileController.createOrUpdateRecruiterProfile
);

// ============================================
// CANDIDATE PROFILE ROUTES
// ============================================

// GET /api/v1/profiles/candidate/:userId - Get candidate profile
router.get('/candidate/:userId', profileController.getCandidateProfile);

// POST /api/v1/profiles/candidate - Create/Update candidate profile
router.post(
  '/candidate',
  authenticate,
  authorize('candidate'),
  validate(candidateProfileSchema),
  profileController.createOrUpdateCandidateProfile
);

// ============================================
// CANDIDATE SKILLS ROUTES
// ============================================

// POST /api/v1/profiles/candidate/skills - Add skill
router.post(
  '/candidate/skills',
  authenticate,
  authorize('candidate'),
  validate(skillSchema),
  profileController.addSkill
);

// PUT /api/v1/profiles/candidate/skills/:skillId - Update skill
router.put(
  '/candidate/skills/:skillId',
  authenticate,
  authorize('candidate'),
  validate(skillSchema),
  profileController.updateSkill
);

// DELETE /api/v1/profiles/candidate/skills/:skillId - Delete skill
router.delete(
  '/candidate/skills/:skillId',
  authenticate,
  authorize('candidate'),
  profileController.deleteSkill
);

// GET /api/v1/profiles/candidate/skills/unverified - Get unverified skills
router.get(
  '/candidate/skills/unverified',
  authenticate,
  authorize('candidate'),
  profileController.getUnverifiedSkills
);

// POST /api/v1/profiles/candidate/skills/unverified/:unverifiedSkillId/exam - Generate exam
router.post(
  '/candidate/skills/unverified/:unverifiedSkillId/exam',
  authenticate,
  authorize('candidate'),
  profileController.generateSkillExam
);

// POST /api/v1/profiles/candidate/skills/unverified/submit-exam - Submit exam
router.post(
  '/candidate/skills/unverified/submit-exam',
  authenticate,
  authorize('candidate'),
  profileController.submitSkillExam
);

// ============================================
// CANDIDATE EXPERIENCE ROUTES
// ============================================

// POST /api/v1/profiles/candidate/experience - Add experience
router.post(
  '/candidate/experience',
  authenticate,
  authorize('candidate'),
  validate(experienceSchema),
  profileController.addExperience
);

// PUT /api/v1/profiles/candidate/experience/:experienceId - Update experience
router.put(
  '/candidate/experience/:experienceId',
  authenticate,
  authorize('candidate'),
  validate(experienceSchema),
  profileController.updateExperience
);

// DELETE /api/v1/profiles/candidate/experience/:experienceId - Delete experience
router.delete(
  '/candidate/experience/:experienceId',
  authenticate,
  authorize('candidate'),
  profileController.deleteExperience
);

// ============================================
// CANDIDATE PROJECTS ROUTES
// ============================================

// POST /api/v1/profiles/candidate/projects - Add project
router.post(
  '/candidate/projects',
  authenticate,
  authorize('candidate'),
  validate(projectSchema),
  profileController.addProject
);

// PUT /api/v1/profiles/candidate/projects/:projectId - Update project
router.put(
  '/candidate/projects/:projectId',
  authenticate,
  authorize('candidate'),
  validate(projectSchema),
  profileController.updateProject
);

// DELETE /api/v1/profiles/candidate/projects/:projectId - Delete project
router.delete(
  '/candidate/projects/:projectId',
  authenticate,
  authorize('candidate'),
  profileController.deleteProject
);

// ============================================
// CANDIDATE EDUCATION ROUTES
// ============================================

// POST /api/v1/profiles/candidate/education - Add education
router.post(
  '/candidate/education',
  authenticate,
  authorize('candidate'),
  validate(educationSchema),
  profileController.addEducation
);

// PUT /api/v1/profiles/candidate/education/:educationId - Update education
router.put(
  '/candidate/education/:educationId',
  authenticate,
  authorize('candidate'),
  validate(educationSchema),
  profileController.updateEducation
);

// DELETE /api/v1/profiles/candidate/education/:educationId - Delete education
router.delete(
  '/candidate/education/:educationId',
  authenticate,
  authorize('candidate'),
  profileController.deleteEducation
);

// ============================================
// CANDIDATE CERTIFICATIONS ROUTES
// ============================================

// POST /api/v1/profiles/candidate/certifications - Add certification
router.post(
  '/candidate/certifications',
  authenticate,
  authorize('candidate'),
  validate(certificationSchema),
  profileController.addCertification
);

// PUT /api/v1/profiles/candidate/certifications/:certificationId - Update certification
router.put(
  '/candidate/certifications/:certificationId',
  authenticate,
  authorize('candidate'),
  validate(certificationSchema),
  profileController.updateCertification
);

// DELETE /api/v1/profiles/candidate/certifications/:certificationId - Delete certification
router.delete(
  '/candidate/certifications/:certificationId',
  authenticate,
  authorize('candidate'),
  profileController.deleteCertification
);

// ============================================
// CANDIDATE JOB PREFERENCES ROUTES
// ============================================

// POST /api/v1/profiles/candidate/job-preferences - Create/Update job preferences
router.post(
  '/candidate/job-preferences',
  authenticate,
  authorize('candidate'),
  validate(jobPreferencesSchema),
  profileController.createOrUpdateJobPreferences
);

// ============================================
// CANDIDATE RESUME UPLOAD ROUTE
// ============================================

// POST /api/v1/profiles/candidate/upload-resume - Upload and parse resume
router.post(
  '/candidate/upload-resume',
  authenticate,
  authorize('candidate'),
  upload.single('resume'),
  profileController.uploadAndParseResume
);

// GET /api/v1/profiles/candidate/:candidateId/download-resume - Download resume
router.get(
  '/candidate/:candidateId/download-resume',
  authenticate,
  profileController.downloadResume
);

// ============================================
// RECRUITER - LIST CANDIDATES ROUTE
// ============================================

// GET /api/v1/profiles/candidates - list candidates prioritized by country match
router.get(
  '/candidates',
  authenticate,
  authorize('recruiter'),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch recruiter country
      const { data: recruiterProfile } = await require('../config/supabase').supabase
        .from('recruiter_profiles')
        .select('country')
        .eq('user_id', userId)
        .single();

      const recruiterCountry = recruiterProfile?.country || null;

      // Fetch candidates with joined preferences and profiles
      const { data: candidates, error } = await require('../config/supabase').supabase
        .from('candidate_profiles')
        .select(`
          *,
          profiles(full_name, email, profile_picture_url),
          candidate_job_preferences(preferred_countries)
        `);

      if (error) throw error;

      // Compute simple score: prioritize by preferred_countries contains recruiter country
      const scored = (candidates || []).map(c => {
        const preferred = c.candidate_job_preferences?.preferred_countries || [];
        const countryMatch = recruiterCountry && preferred.includes(recruiterCountry) ? 1 : 0;
        return { ...c, _score: countryMatch };
      });

      scored.sort((a, b) => b._score - a._score);

      res.json({ candidates: scored });
    } catch (err) {
      console.error('List candidates error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list candidates' });
    }
  }
);

// ============================================
// CANDIDATE HEADSHOT ROUTES
// ============================================

// POST /api/v1/profiles/candidate/headshots/generate - Generate professional headshot
router.post(
  '/candidate/headshots/generate',
  authenticate,
  authorize('candidate'),
  imageUpload.single('image'),
  (req, res) => getHeadshotController().generateHeadshot(req, res)
);

// GET /api/v1/profiles/candidate/headshots/history - Get headshot history
router.get(
  '/candidate/headshots/history',
  authenticate,
  authorize('candidate'),
  (req, res) => getHeadshotController().getHeadshotHistory(req, res)
);

// DELETE /api/v1/profiles/candidate/headshots/:headshotId - Delete headshot
router.delete(
  '/candidate/headshots/:headshotId',
  authenticate,
  authorize('candidate'),
  (req, res) => getHeadshotController().deleteHeadshot(req, res)
);

module.exports = router;

