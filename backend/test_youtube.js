const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

async function testYoutubeAPI() {
    if (!API_KEY) {
        console.error('ERROR: YOUTUBE_API_KEY is missing in .env');
        return;
    }

    console.log('Testing YouTube API with key:', API_KEY.substring(0, 5) + '...');

    try {
        const response = await axios.get(`${BASE_URL}/search`, {
            params: {
                key: API_KEY,
                q: 'JavaScript tutorial',
                part: 'snippet',
                type: 'video',
                maxResults: 1
            }
        });

        console.log('✅ API Call Successful!');
        console.log(`Found ${response.data.items.length} videos.`);
        if (response.data.items.length > 0) {
            console.log('Sample video:', response.data.items[0].snippet.title);
        }

    } catch (error) {
        console.error('❌ API Call Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testYoutubeAPI();
