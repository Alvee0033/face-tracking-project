const express = require('express')
const router = express.Router()
const { generateToken } = require('../controllers/agora.controller')
const { authenticate } = require('../middleware/auth.middleware')

// Generate Agora RTC token (protected route)
router.post('/token', authenticate, generateToken)

module.exports = router
