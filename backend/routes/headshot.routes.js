const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

// Try to load headshot controller, but make it optional
// Wrap in a function to defer loading until routes are actually used
let headshotController = null;
let headshotControllerError = null;

function getHeadshotController() {
  if (headshotController) return headshotController;
  if (headshotControllerError) {
    return {
      generateHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      getHeadshotHistory: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      deleteHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' })
    };
  }
  
  try {
    headshotController = require('../controllers/headshot.controller');
    return headshotController;
  } catch (error) {
    console.warn('⚠️  Headshot controller not available:', error.message);
    headshotControllerError = error;
    return {
      generateHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      getHeadshotHistory: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' }),
      deleteHeadshot: (req, res) => res.status(503).json({ error: 'Headshot feature unavailable - missing dependencies' })
    };
  }
}

/**
 * @route   POST /api/v1/headshots/generate
 * @desc    Generate a professional headshot from uploaded image
 * @access  Private (Candidate)
 */
router.post('/generate', authenticate, (req, res) => getHeadshotController().generateHeadshot(req, res));

/**
 * @route   GET /api/v1/headshots/history
 * @desc    Get headshot generation history for authenticated candidate
 * @access  Private (Candidate)
 */
router.get('/history', authenticate, (req, res) => getHeadshotController().getHeadshotHistory(req, res));

/**
 * @route   DELETE /api/v1/headshots/:id
 * @desc    Delete a specific headshot from history
 * @access  Private (Candidate)
 */
router.delete('/:id', authenticate, (req, res) => getHeadshotController().deleteHeadshot(req, res));

module.exports = router;
