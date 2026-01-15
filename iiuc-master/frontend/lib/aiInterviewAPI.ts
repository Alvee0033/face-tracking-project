import { aiInterviewAPI } from './api'

export interface InterviewSession {
    session_id: string
    question: string
    question_id: string
    question_number: number
    total_questions: number
}

export interface SubmitAnswerResponse {
    score: number
    feedback: string
    next_question?: string
    next_question_id?: string
    question_number?: number
    total_questions?: number
    is_complete: boolean
    message?: string
}

export interface CompleteInterviewResponse {
    overall_score: number
    attention_score: number
    feedback: string
}

export const aiInterviewAPI = {
    // Start interview session
    async startInterview(interviewId: string): Promise<InterviewSession> {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })

        const data = await response.json()
        if (!data.success) {
            throw new Error(data.error || 'Failed to start interview')
        }

        return data.data
    },

    // Submit answer
    async submitAnswer(
        interviewId: string,
        sessionId: string,
        questionId: string,
        answerText?: string,
        audioBase64?: string
    ): Promise<SubmitAnswerResponse> {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/submit-answer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                question_id: questionId,
                answer_text: answerText,
                audio_base64: audioBase64
            })
        })

        const data = await response.json()
        if (!data.success) {
            throw new Error(data.error || 'Failed to submit answer')
        }

        return data.data
    },

    // Log attention data
    async logAttention(
        interviewId: string,
        sessionId: string,
        attentionData: {
            attention_detected: boolean
            face_detected: boolean
            eyes_on_screen: boolean
            head_pose: { pitch: number; yaw: number; roll: number }
        }
    ): Promise<void> {
        const token = localStorage.getItem('access_token')
        await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/log-attention`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                ...attentionData
            })
        })
    },

    // Complete interview
    async completeInterview(
        interviewId: string,
        sessionId: string,
        tabSwitches: number,
        fullscreenExits: number
    ): Promise<CompleteInterviewResponse> {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                tab_switches: tabSwitches,
                fullscreen_exits: fullscreenExits
            })
        })

        const data = await response.json()
        if (!data.success) {
            throw new Error(data.error || 'Failed to complete interview')
        }

        return data.data
    }
}
