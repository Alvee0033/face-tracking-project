const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const cvController = require('../controllers/cv.controller');

// All routes require authentication
router.use(authenticate);

// Get full profile data for CV
router.get('/profile', cvController.getCandidateProfileForCV);

// Generate professional summary
router.post('/summary', cvController.generateProfessionalSummary);

// Enhance bullet points
router.post('/enhance-bullets', cvController.enhanceBulletPoints);

// Generate recommendations
router.post('/recommendations', cvController.generateRecommendations);

module.exports = router;

