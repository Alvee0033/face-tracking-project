const express = require('express');
const router = express.Router();
const {
  saveJob,
  removeSavedJob,
  getSavedJobs,
  addInterestedJob,
  removeInterestedJob,
  getInterestedJobs,
  getLearningRoadmap,
  checkJobSaved
} = require('../controllers/savedJob.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Saved jobs routes
router.post('/saved/:jobId', authenticate, saveJob);
router.delete('/saved/:jobId', authenticate, removeSavedJob);
router.get('/saved', authenticate, getSavedJobs);

// Interested jobs routes
router.post('/interested/:jobId', authenticate, addInterestedJob);
router.delete('/interested/:jobId', authenticate, removeInterestedJob);
router.get('/interested', authenticate, getInterestedJobs);

// Learning roadmap
router.get('/roadmap', authenticate, getLearningRoadmap);

// Check job status (saved/interested)
router.get('/check/:jobId', authenticate, checkJobSaved);

module.exports = router;

