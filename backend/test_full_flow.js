const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
const TOKEN = process.argv[2];

if (!TOKEN) {
    console.error('Please provide auth token as argument');
    console.error('Usage: node test_full_flow.js YOUR_TOKEN');
    process.exit(1);
}

async function testFullFlow() {
    console.log('\n========== TESTING FULL FLOW ==========\n');

    try {
        // Step 1: Get roadmap
        console.log('1. Fetching roadmap...');
        const roadmapRes = await axios.get(`${BASE_URL}/saved-jobs/roadmap?force=true`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        console.log('✅ Roadmap fetched');
        console.log('   Phases:', roadmapRes.data.roadmap?.learning_phases?.length || 0);

        const firstPhase = roadmapRes.data.roadmap?.learning_phases?.[0];
        console.log('   First phase:', firstPhase?.title);
        console.log('   Skills in first phase:', firstPhase?.skills?.length || 0);

        if (firstPhase?.skills?.length > 0) {
            console.log('   First skill:', firstPhase.skills[0].skill || firstPhase.skills[0].name || 'MISSING NAME');
            console.log('   First skill level:', firstPhase.skills[0].difficulty || firstPhase.skills[0].skill_level || 'MISSING LEVEL');
        }

        // Step 2: Auto-populate courses
        console.log('\n2. Auto-populating courses...');
        const coursesRes = await axios.post(`${BASE_URL}/courses/auto-populate`, {}, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        console.log('✅ Auto-populate completed');
        console.log('   Courses added:', coursesRes.data.coursesAdded);
        console.log('   Skills processed:', coursesRes.data.skillsProcessed);

        // Step 3: Get courses
        console.log('\n3. Fetching courses...');
        const myCoursesRes = await axios.get(`${BASE_URL}/courses/my-courses`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        console.log('✅ Courses fetched');
        console.log('   Total courses:', myCoursesRes.data.courses?.length || 0);

        if (myCoursesRes.data.courses?.length > 0) {
            const firstCourse = myCoursesRes.data.courses[0];
            console.log('   First course:');
            console.log('     - Title:', firstCourse.video_title);
            console.log('     - Skill:', firstCourse.skill_name);
            console.log('     - Level:', firstCourse.skill_level);
            console.log('     - Video ID:', firstCourse.youtube_video_id);
        } else {
            console.log('   ⚠️ NO COURSES FOUND!');
        }

        console.log('\n========== TEST COMPLETE ==========\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
    }
}

testFullFlow();
