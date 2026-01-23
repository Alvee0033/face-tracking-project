const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const videoCallController = require('../controllers/videoCall.controller');

// All routes require authentication
router.use(authenticate);

// Generate video call token
router.post('/token', videoCallController.generateVideoCallToken);

// Generate Jitsi token
router.post('/jitsi-token', videoCallController.generateJitsiToken);

// Start a video call
router.post('/start', videoCallController.startVideoCall);

// End a video call
router.put('/:callId/end', videoCallController.endVideoCall);

// Get video call history for a conversation
router.get('/conversation/:conversationId/history', videoCallController.getVideoCallHistory);

// Schedule an interview (recruiters only)
// Schedule an interview (recruiters only)
router.post('/schedule', (req, res, next) => {
    console.log('[DEBUG] Route Matched: /video-calls/schedule');
    next();
}, videoCallController.scheduleInterview);

// Get scheduled interviews for current user
router.get('/scheduled', videoCallController.getScheduledInterviews);

// Cancel a scheduled interview
router.delete('/scheduled/:interviewId', videoCallController.cancelScheduledInterview);

module.exports = router;
