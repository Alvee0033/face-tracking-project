const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { signupSchema, loginSchema } = require('../validators/auth.validator');

// POST /api/v1/auth/signup - Register new user
router.post('/signup', validate(signupSchema), authController.signup);

// POST /api/v1/auth/login - Login user
router.post('/login', validate(loginSchema), authController.login);

// POST /api/v1/auth/verify - Verify email
router.post('/verify', authController.verifyEmail);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', authController.logout);

// GET /api/v1/auth/me - Get current user
router.get('/me', authController.getCurrentUser);

module.exports = router;

