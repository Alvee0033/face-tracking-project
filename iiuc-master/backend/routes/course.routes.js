const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/courses/my-courses
 * @desc    Get all active courses for authenticated candidate
 * @access  Private (Candidate only)
 */
router.get('/my-courses', courseController.getMyCourses);

/**
 * @route   GET /api/v1/courses/archived
 * @desc    Get archived courses for authenticated candidate
 * @access  Private (Candidate only)
 */
router.get('/archived', courseController.getArchivedCourses);

/**
 * @route   POST /api/v1/courses/auto-populate
 * @desc    Auto-populate courses for all skills in roadmap
 * @access  Private (Candidate only)
 */
router.post('/auto-populate', courseController.autoPopulateCourses);

/**
 * @route   POST /api/v1/courses/add
 * @desc    Add a course for a specific skill
 * @access  Private (Candidate only)
 */
router.post('/add', courseController.addCourseForSkill);

/**
 * @route   PUT /api/v1/courses/:courseId/watch
 * @desc    Update watch status of a course
 * @access  Private (Candidate only)
 */
router.put('/:courseId/watch', courseController.updateWatchStatus);

/**
 * @route   DELETE /api/v1/courses/:courseId
 * @desc    Delete a course
 * @access  Private (Candidate only)
 */
router.delete('/:courseId', courseController.deleteCourse);

module.exports = router;

