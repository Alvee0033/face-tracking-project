const express = require('express');
const router = express.Router();
const externalJobsController = require('../controllers/externalJobs.controller');

// GET /api/v1/external-jobs - Search external jobs via SerpAPI
router.get('/', externalJobsController.searchExternalJobs);

// GET /api/v1/external-jobs/:jobId - Get external job details
router.get('/:jobId', externalJobsController.getExternalJobDetails);

module.exports = router;
