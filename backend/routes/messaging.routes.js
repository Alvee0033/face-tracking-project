const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const messagingController = require('../controllers/messaging.controller');

// All messaging routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations for the authenticated user (candidate)
 * @access  Private (Candidate only)
 */
router.get('/conversations', messagingController.getCandidateConversations);

/**
 * @route   GET /api/v1/messages/recruiter/conversations
 * @desc    Get all conversations for the authenticated recruiter
 * @access  Private (Recruiter only)
 */
router.get('/recruiter/conversations', messagingController.getRecruiterConversations);

/**
 * @route   POST /api/v1/messages/conversation/:conversationId/send
 * @desc    Send a message in a conversation
 * @access  Private (Recruiter can always send, Candidate can send only if initiated)
 */
router.post('/conversation/:conversationId/send', messagingController.sendMessage);

/**
 * @route   GET /api/v1/messages/conversation/:conversationId
 * @desc    Get all messages in a conversation
 * @access  Private (Conversation participants)
 */
router.get('/conversation/:conversationId', messagingController.getMessages);

/**
 * @route   PUT /api/v1/messages/conversation/:conversationId/read
 * @desc    Mark messages as read
 * @access  Private (Conversation participants)
 */
router.put('/conversation/:conversationId/read', messagingController.markMessagesAsRead);

/**
 * @route   GET /api/v1/messages/conversation/:conversationId/details
 * @desc    Get conversation details with participant info
 * @access  Private (Conversation participants)
 */
router.get('/conversation/:conversationId/details', messagingController.getConversation);

/**
 * @route   POST /api/v1/messages/conversation/:conversationId/call
 * @desc    Initiate a call (recruiter only)
 * @access  Private (Recruiter only)
 */
router.post('/conversation/:conversationId/call', messagingController.initiateCall);

/**
 * @route   PUT /api/v1/messages/call/:callId/status
 * @desc    Update call status
 * @access  Private (Call participants)
 */
router.put('/call/:callId/status', messagingController.updateCallStatus);

/**
 * @route   GET /api/v1/messages/conversation/:conversationId/calls
 * @desc    Get call history for a conversation
 * @access  Private (Conversation participants)
 */
router.get('/conversation/:conversationId/calls', messagingController.getCallHistory);

module.exports = router;
