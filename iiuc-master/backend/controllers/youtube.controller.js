const YouTubeService = require('../services/youtube.service');

/**
 * Search for YouTube courses for a specific skill
 * @route GET /api/v1/youtube/search
 * @query skill - Skill name
 * @query level - Skill level (Beginner, Intermediate, Advanced, Expert)
 * @query maxVideos - Maximum number of videos (optional, default 5)
 */
const searchCourses = async (req, res) => {
    try {
        const { skill, level, maxVideos = 5 } = req.query;

        if (!skill || !level) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Skill and level parameters are required'
            });
        }

        const videos = await YouTubeService.searchCourseForSkill(
            skill,
            level,
            '', // learningPath - can be added later
            parseInt(maxVideos)
        );

        res.json({
            message: 'YouTube courses retrieved successfully',
            skill,
            level,
            count: videos.length,
            videos
        });

    } catch (error) {
        console.error('YouTube search controller error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to search YouTube courses'
        });
    }
};

module.exports = {
    searchCourses
};
