import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export interface AttentionData {
    faceDetected: boolean
    eyesOnScreen: boolean
    headPose: { pitch: number; yaw: number; roll: number }
    attentionScore: number
}

export function useMediaPipeAttention(videoElement: HTMLVideoElement | null) {
    const [attentionData, setAttentionData] = useState<AttentionData>({
        faceDetected: false,
        eyesOnScreen: true,
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        attentionScore: 100
    })

    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const attentionScoreRef = useRef(100)

    useEffect(() => {
        let isActive = true

        const initMediaPipe = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                )

                const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    numFaces: 1
                })

                if (isActive) {
                    faceLandmarkerRef.current = faceLandmarker
                    startDetection()
                }
            } catch (error) {
                console.error('MediaPipe initialization failed:', error)
            }
        }

        const startDetection = () => {
            if (!videoElement || !faceLandmarkerRef.current) return

            const detect = () => {
                if (!isActive || !videoElement || !faceLandmarkerRef.current) return

                const results = faceLandmarkerRef.current.detectForVideo(videoElement, Date.now())

                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0]

                    // Calculate head pose (simplified)
                    const nose = landmarks[1]
                    const leftEye = landmarks[33]
                    const rightEye = landmarks[263]

                    // Estimate yaw (left-right head turn)
                    const yaw = (nose.x - 0.5) * 60 // -30 to +30 degrees

                    // Estimate pitch (up-down head tilt)
                    const pitch = (nose.y - 0.5) * 60

                    // Eyes on screen detection (if head is roughly facing forward)
                    const eyesOnScreen = Math.abs(yaw) < 25 && Math.abs(pitch) < 25

                    // Update attention score
                    if (eyesOnScreen) {
                        attentionScoreRef.current = Math.min(100, attentionScoreRef.current + 0.5)
                    } else {
                        attentionScoreRef.current = Math.max(0, attentionScoreRef.current - 2)
                    }

                    setAttentionData({
                        faceDetected: true,
                        eyesOnScreen,
                        headPose: { pitch, yaw, roll: 0 },
                        attentionScore: Math.round(attentionScoreRef.current)
                    })
                } else {
                    // No face detected
                    attentionScoreRef.current = Math.max(0, attentionScoreRef.current - 3)
                    setAttentionData({
                        faceDetected: false,
                        eyesOnScreen: false,
                        headPose: { pitch: 0, yaw: 0, roll: 0 },
                        attentionScore: Math.round(attentionScoreRef.current)
                    })
                }

                animationFrameRef.current = requestAnimationFrame(detect)
            }

            detect()
        }

        if (videoElement) {
            initMediaPipe()
        }

        return () => {
            isActive = false
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close()
            }
        }
    }, [videoElement])

    return attentionData
}
