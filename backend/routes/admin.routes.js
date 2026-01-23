const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const Joi = require('joi');

// Admin registration schema (should be protected)
const adminRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  fullName: Joi.string().min(2).max(100).required()
});

// POST /api/v1/admin/register - Register new admin (protected)
router.post('/register', authenticate, authorize('admin'), validate(adminRegisterSchema), adminController.registerAdmin);

// GET /api/v1/admin/dashboard - Get dashboard analytics
router.get('/dashboard', authenticate, authorize('admin'), adminController.getDashboardAnalytics);

// GET /api/v1/admin/analytics - Get detailed analytics with AI insights
router.get('/analytics', authenticate, authorize('admin'), adminController.getDetailedAnalytics);

module.exports = router;

