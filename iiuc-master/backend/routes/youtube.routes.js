const express = require('express');
const router = express.Router();
const { searchCourses } = require('../controllers/youtube.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Search YouTube courses for a skill
router.get('/search', authenticate, searchCourses);

module.exports = router;
