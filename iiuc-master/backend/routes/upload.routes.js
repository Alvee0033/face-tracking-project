const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
const uploadController = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/profile-image', authMiddleware.authenticate, upload.single('file'), uploadController.uploadProfileImage);

module.exports = router;
