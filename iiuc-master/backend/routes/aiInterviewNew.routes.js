const express = require('express');
const router = express.Router();
const aiInterviewNew = require('../controllers/aiInterviewNew.controller');
const { authenticate } = require('../middleware/auth.middleware');

// ============================================
// NEW AI INTERVIEW SYSTEM ROUTES
// ============================================

// RECRUITER: Schedule interview
router.post('/schedule', authenticate, aiInterviewNew.scheduleInterview);

// RECRUITER: Get interview report
router.get('/:id/report', authenticate, aiInterviewNew.getInterviewReport);

// CANDIDATE: Get my interviews
router.get('/candidate/:candidateId', authenticate, aiInterviewNew.getCandidateInterviews);

// CANDIDATE: Start interview session
router.post('/:id/start', authenticate, aiInterviewNew.startInterview);

// CANDIDATE: Submit answer (with Whisper transcription)
router.post('/:id/submit-answer', authenticate, aiInterviewNew.submitAnswer);

// CANDIDATE: Log attention data
router.post('/:id/log-attention', authenticate, aiInterviewNew.logAttention);

// CANDIDATE: Complete interview
router.post('/:id/complete', authenticate, aiInterviewNew.completeInterview);

// TEST: Create demo interview
router.post('/create-test', authenticate, aiInterviewNew.createTestInterview);

module.exports = router;
