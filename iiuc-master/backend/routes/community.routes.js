const express = require('express');
const router = express.Router();
const communityController = require('../controllers/community.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes (or protected depending on requirement, usually feed is public or semi-public)
router.get('/posts', authMiddleware.optionalAuth, communityController.getPosts);

// Protected routes
router.post('/posts', authMiddleware.authenticate, communityController.createPost);
router.post('/posts/:postId/like', authMiddleware.authenticate, communityController.toggleLike);

module.exports = router;
