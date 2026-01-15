const express = require('express');
const router = express.Router();
const aiInterviewController = require('../controllers/aiInterview.controller');
const { authenticate } = require('../middleware/auth.middleware');
const multer = require('multer');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'audio/m4a',
            'audio/mp4',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/webm',
            'audio/ogg',
            'audio/flac',
            'audio/x-m4a'
        ];

        if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(m4a|mp3|wav|webm|ogg|flac)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid audio file format. Allowed formats: m4a, mp3, wav, webm, ogg, flac'));
        }
    }
});

// ============================================
// RECRUITER ROUTES
// ============================================

// Template management
router.post('/templates', authenticate, aiInterviewController.createTemplate);
router.get('/templates', authenticate, aiInterviewController.getTemplates);
router.get('/templates/:id', authenticate, aiInterviewController.getTemplateById);
router.put('/templates/:id', authenticate, aiInterviewController.updateTemplate);
router.delete('/templates/:id', authenticate, aiInterviewController.deleteTemplate);

// AI question generation
router.post('/templates/:id/generate-questions', authenticate, aiInterviewController.generateQuestions);

// Interview assignment
router.post('/assign', authenticate, aiInterviewController.assignInterview);
router.post('/assign-quick', authenticate, upload.single('file'), aiInterviewController.assignQuickInterview);

// Interview results
router.get('/sessions/:sessionId/results', authenticate, aiInterviewController.getInterviewResults);

// ============================================
// CANDIDATE ROUTES
// ============================================

// Get candidate's interviews
router.get('/my-interviews', authenticate, aiInterviewController.getMyInterviews);

// Interview session management
router.post('/sessions/:sessionId/start', authenticate, aiInterviewController.startInterview);
router.post('/sessions/:sessionId/responses', authenticate, aiInterviewController.submitResponse);
router.post('/sessions/:sessionId/attention', authenticate, aiInterviewController.submitAttentionData);
router.post('/sessions/:sessionId/complete', authenticate, aiInterviewController.completeInterview);

// Audio transcription
router.post('/transcribe', authenticate, upload.single('audio'), aiInterviewController.transcribeAudio);

module.exports = router;
