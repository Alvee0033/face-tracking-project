const axios = require('axios');

/**
 * Test script for AI Interview endpoints
 * Run with: node test_ai_interview.js
 */

const BASE_URL = 'http://localhost:5000/api/v1';

// You'll need to replace these with actual tokens from your system
const RECRUITER_TOKEN = 'YOUR_RECRUITER_JWT_TOKEN';
const CANDIDATE_TOKEN = 'YOUR_CANDIDATE_JWT_TOKEN';

// Test data
const TEST_JOB_ID = 'YOUR_JOB_ID';
const TEST_CANDIDATE_ID = 'YOUR_CANDIDATE_ID';

async function testScheduleInterview() {
    console.log('\n🧪 Testing: Schedule Interview (Recruiter)');
    try {
        const response = await axios.post(
            `${BASE_URL}/ai-interviews/schedule`,
            {
                job_id: TEST_JOB_ID,
                candidate_id: TEST_CANDIDATE_ID,
                scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                duration_minutes: 30
            },
            {
                headers: { Authorization: `Bearer ${RECRUITER_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
        return response.data.data.interview.id;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        return null;
    }
}

async function testGetCandidateInterviews(candidateId) {
    console.log('\n🧪 Testing: Get Candidate Interviews');
    try {
        const response = await axios.get(
            `${BASE_URL}/ai-interviews/candidate/${candidateId}`,
            {
                headers: { Authorization: `Bearer ${CANDIDATE_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
        return response.data.data.interviews;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        return null;
    }
}

async function testStartInterview(interviewId) {
    console.log('\n🧪 Testing: Start Interview Session');
    try {
        const response = await axios.post(
            `${BASE_URL}/ai-interviews/${interviewId}/start`,
            {},
            {
                headers: { Authorization: `Bearer ${CANDIDATE_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
        return response.data.data;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        return null;
    }
}

async function testSubmitAnswer(interviewId, sessionId, questionId) {
    console.log('\n🧪 Testing: Submit Answer (Text)');
    try {
        const response = await axios.post(
            `${BASE_URL}/ai-interviews/${interviewId}/submit-answer`,
            {
                session_id: sessionId,
                question_id: questionId,
                answer_text: "I have 5 years of experience with JavaScript, including React and Node.js. I've built several full-stack applications and am comfortable with modern frameworks."
            },
            {
                headers: { Authorization: `Bearer ${CANDIDATE_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
        return response.data.data;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        return null;
    }
}

async function testLogAttention(interviewId, sessionId) {
    console.log('\n🧪 Testing: Log Attention Data');
    try {
        const response = await axios.post(
            `${BASE_URL}/ai-interviews/${interviewId}/log-attention`,
            {
                session_id: sessionId,
                attention_detected: true,
                face_detected: true,
                eyes_on_screen: true,
                head_pose: { pitch: 0, yaw: 0, roll: 0 }
            },
            {
                headers: { Authorization: `Bearer ${CANDIDATE_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function testCompleteInterview(interviewId, sessionId) {
    console.log('\n🧪 Testing: Complete Interview');
    try {
        const response = await axios.post(
            `${BASE_URL}/ai-interviews/${interviewId}/complete`,
            {
                session_id: sessionId,
                tab_switches: 0,
                fullscreen_exits: 0
            },
            {
                headers: { Authorization: `Bearer ${CANDIDATE_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
        return response.data.data;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        return null;
    }
}

async function testGetInterviewReport(interviewId) {
    console.log('\n🧪 Testing: Get Interview Report (Recruiter)');
    try {
        const response = await axios.get(
            `${BASE_URL}/ai-interviews/${interviewId}/report`,
            {
                headers: { Authorization: `Bearer ${RECRUITER_TOKEN}` }
            }
        );
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Starting AI Interview API Tests...\n');
    console.log('⚠️  Make sure to update the tokens and IDs in this file first!\n');

    // Test 1: Schedule Interview
    const interviewId = await testScheduleInterview();
    if (!interviewId) {
        console.log('\n❌ Cannot continue tests without interview ID');
        return;
    }

    // Test 2: Get Candidate Interviews
    await testGetCandidateInterviews(TEST_CANDIDATE_ID);

    // Test 3: Start Interview
    const sessionData = await testStartInterview(interviewId);
    if (!sessionData) {
        console.log('\n❌ Cannot continue tests without session data');
        return;
    }

    const { session_id, question_id } = sessionData;

    // Test 4: Log Attention (simulate)
    await testLogAttention(interviewId, session_id);

    // Test 5: Submit Answer
    const answerData = await testSubmitAnswer(interviewId, session_id, question_id);

    // Test 6: Complete Interview (after answering all questions)
    // Note: In real scenario, you'd answer all 5 questions first
    // await testCompleteInterview(interviewId, session_id);

    // Test 7: Get Interview Report
    // await testGetInterviewReport(interviewId);

    console.log('\n✅ All tests completed!');
    console.log('\n📝 Note: Some tests are commented out to avoid completing the interview prematurely.');
    console.log('   Uncomment them after answering all questions in a real scenario.\n');
}

// Run tests
runAllTests().catch(console.error);
