const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { jobSchema } = require('../validators/job.validator');

// ============================================
// PUBLIC JOB ROUTES (No auth required)
// ============================================

// ============================================
// RECRUITER JOB ROUTES (Auth required)
// ============================================

// GET /api/v1/jobs/recruiter/my-jobs - Get recruiter's own jobs
router.get('/recruiter/my-jobs', authenticate, authorize('recruiter'), jobController.getRecruiterJobs);

// POST /api/v1/jobs - Create new job
router.post('/', authenticate, authorize('recruiter'), validate(jobSchema), jobController.createJob);

// PUT /api/v1/jobs/:jobId - Update job
router.put('/:jobId', authenticate, authorize('recruiter'), validate(jobSchema), jobController.updateJob);

// DELETE /api/v1/jobs/:jobId - Delete job
router.delete('/:jobId', authenticate, authorize('recruiter'), jobController.deleteJob);

// PATCH /api/v1/jobs/:jobId/status - Update job status
router.patch('/:jobId/status', authenticate, authorize('recruiter'), jobController.updateJobStatus);

// ============================================
// PUBLIC JOB ROUTES (No auth required)
// ============================================

// GET /api/v1/jobs - Get all active jobs (with filters)
router.get('/', jobController.getAllJobs);

// GET /api/v1/jobs/:jobId - Get single job details
router.get('/:jobId', jobController.getJobById);

// POST /api/v1/jobs/:jobId/view - Increment view count
router.post('/:jobId/view', jobController.incrementViewCount);

module.exports = router;

