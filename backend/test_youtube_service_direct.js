require('dotenv').config();
const youtubeService = require('./services/youtube.service');

async function testDirectSearch() {
    console.log('Testing YouTube Service directly...');
    try {
        const videos = await youtubeService.searchCourseForSkill('React', 'Beginner', 'Learn basics of React components');
        console.log('Videos found:', videos.length);
        if (videos.length > 0) {
            console.log('First video:', videos[0]);
        } else {
            console.log('No videos returned.');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testDirectSearch();
