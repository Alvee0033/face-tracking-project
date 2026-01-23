const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { applicationSchema } = require('../validators/application.validator');

// ============================================
// CANDIDATE APPLICATION ROUTES
// ============================================

// POST /api/v1/applications - Submit job application
router.post(
  '/',
  authenticate,
  authorize('candidate'),
  validate(applicationSchema),
  applicationController.submitApplication
);

// GET /api/v1/applications/candidate - Get candidate's own applications
router.get(
  '/candidate',
  authenticate,
  authorize('candidate'),
  applicationController.getCandidateApplications
);

// GET /api/v1/applications/candidate/:applicationId - Get candidate application details
router.get(
  '/candidate/:applicationId',
  authenticate,
  authorize('candidate'),
  applicationController.getCandidateApplicationById
);

// DELETE /api/v1/applications/candidate/:applicationId - Withdraw application
router.delete(
  '/candidate/:applicationId',
  authenticate,
  authorize('candidate'),
  applicationController.withdrawApplication
);

// ============================================
// RECRUITER APPLICATION ROUTES
// ============================================

// GET /api/v1/applications/job/:jobId - Get applications for a job
router.get(
  '/job/:jobId',
  authenticate,
  authorize('recruiter'),
  applicationController.getJobApplications
);

// GET /api/v1/applications/:applicationId - Get application details
router.get(
  '/:applicationId',
  authenticate,
  authorize('recruiter'),
  applicationController.getApplicationById
);

// PATCH /api/v1/applications/:applicationId/status - Update application status
router.patch(
  '/:applicationId/status',
  authenticate,
  authorize('recruiter'),
  applicationController.updateApplicationStatus
);

module.exports = router;
