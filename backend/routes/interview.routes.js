const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const interviewController = require('../controllers/interview.controller');

// All interview routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/interviews
 * @desc    Get all jobs with selected candidates for interview (recruiter only)
 * @access  Private (Recruiter)
 */
router.get('/', interviewController.getRecruiterInterviews);

/**
 * @route   GET /api/v1/interviews/job/:jobId/candidates
 * @desc    Get selected candidates for a specific job
 * @access  Private (Recruiter)
 */
router.get('/job/:jobId/candidates', interviewController.getJobInterviewCandidates);

/**
 * @route   PUT /api/v1/interviews/application/:applicationId/status
 * @desc    Update application status (shortlist, schedule interview, etc.)
 * @access  Private (Recruiter)
 */
router.put('/application/:applicationId/status', interviewController.updateApplicationStatus);

/**
 * @route   GET /api/v1/interviews/application/:applicationId/conversation
 * @desc    Get or create conversation for an application
 * @access  Private (Recruiter)
 */
router.get('/application/:applicationId/conversation', interviewController.getOrCreateConversation);

/**
 * @route   GET /api/v1/interviews/inbox-candidates
 * @desc    Get all jobs with candidates for inbox (recruiter only)
 * @access  Private (Recruiter)
 */
router.get('/inbox-candidates', interviewController.getRecruiterInboxCandidates);

module.exports = router;
