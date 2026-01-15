"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Mic, MicOff, Volume2, VolumeX, AlertCircle,
    Clock, CheckCircle, Loader2, Eye, EyeOff, Video
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMediaPipeAttention } from "@/hooks/useMediaPipeAttention"
import { useTextToSpeech } from "@/hooks/useTextToSpeech"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAntiCheat } from "@/hooks/useAntiCheat"

export default function AIInterviewSessionPage() {
    const params = useParams()
    const router = useRouter()
    const interviewId = params.id as string

    // State
    const [session, setSession] = useState<any>(null)
    const [currentQuestion, setCurrentQuestion] = useState("")
    const [questionNumber, setQuestionNumber] = useState(0)
    const [totalQuestions, setTotalQuestions] = useState(5)
    const [transcript, setTranscript] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(1800)
    const [isComplete, setIsComplete] = useState(false)
    const [finalScore, setFinalScore] = useState<any>(null)
    const [aiSpeaking, setAiSpeaking] = useState(false)

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const recognitionRef = useRef<any>(null)
    const attentionIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Hooks
    const attentionData = useMediaPipeAttention(videoRef.current)
    const { speak, stop: stopSpeaking } = useTextToSpeech()
    const audioRecorder = useAudioRecorder()
    const antiCheat = useAntiCheat({
        enforceFullscreen: true,
        onViolation: (type) => {
            console.warn(`Violation detected: ${type}`)
        }
    })

    // Initialize
    useEffect(() => {
        startInterview()
        setupCamera()
        setupSpeechRecognition()

        return cleanup
    }, [])

    // Timer
    useEffect(() => {
        if (session && !isComplete) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleCompleteInterview()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [session, isComplete])

    // Attention logging
    useEffect(() => {
        if (session && !isComplete) {
            attentionIntervalRef.current = setInterval(async () => {
                try {
                    const token = localStorage.getItem('access_token')
                    await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/log-attention`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            session_id: session.session_id,
                            attention_detected: attentionData.eyesOnScreen && attentionData.faceDetected,
                            face_detected: attentionData.faceDetected,
                            eyes_on_screen: attentionData.eyesOnScreen,
                            head_pose: attentionData.headPose
                        })
                    })
                } catch (error) {
                    console.error('Failed to log attention:', error)
                }
            }, 2000)

            return () => {
                if (attentionIntervalRef.current) {
                    clearInterval(attentionIntervalRef.current)
                }
            }
        }
    }, [session, isComplete, attentionData, interviewId])

    const startInterview = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()
            if (data.success) {
                setSession(data.data)
                setCurrentQuestion(data.data.question)
                setQuestionNumber(data.data.question_number)
                setTotalQuestions(data.data.total_questions)

                // AI speaks the question
                speakQuestion(data.data.question)
            }
        } catch (error) {
            console.error('Failed to start interview:', error)
        }
    }

    const setupCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false
            })

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
        } catch (error) {
            console.error('Camera access denied:', error)
        }
    }

    const setupSpeechRecognition = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true

            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = ""
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript
                }
                setTranscript(currentTranscript)
            }
        }
    }

    const speakQuestion = (question: string) => {
        setAiSpeaking(true)
        speak(question, {
            rate: 0.9,
            pitch: 1.0,
            onEnd: () => setAiSpeaking(false)
        })
    }

    const startRecording = async () => {
        setTranscript("")

        if (recognitionRef.current) {
            recognitionRef.current.start()
        }

        await audioRecorder.startRecording()
    }

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }

        audioRecorder.stopRecording()

        // Wait a bit for audio processing
        setTimeout(() => {
            handleSubmitAnswer()
        }, 500)
    }

    const handleSubmitAnswer = async () => {
        if (!transcript && !audioRecorder.audioBase64) return

        setIsSubmitting(true)

        try {
            const token = localStorage.getItem('access_token')

            const response = await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/submit-answer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: session.session_id,
                    question_id: session.question_id,
                    audio_base64: audioRecorder.audioBase64,
                    answer_text: transcript
                })
            })

            const data = await response.json()
            if (data.success) {
                audioRecorder.reset()

                if (data.data.is_complete) {
                    setIsComplete(true)
                    handleCompleteInterview()
                } else {
                    setCurrentQuestion(data.data.next_question)
                    setQuestionNumber(data.data.question_number)
                    setSession({ ...session, question_id: data.data.next_question_id })
                    setTranscript("")

                    // AI speaks next question
                    speakQuestion(data.data.next_question)
                }
            }
        } catch (error) {
            console.error('Failed to submit answer:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCompleteInterview = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`http://localhost:5000/api/v1/ai-interviews/${interviewId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: session.session_id,
                    tab_switches: antiCheat.tabSwitches,
                    fullscreen_exits: antiCheat.fullscreenExits
                })
            })

            const data = await response.json()
            if (data.success) {
                setFinalScore(data.data)
                setIsComplete(true)
            }
        } catch (error) {
            console.error('Failed to complete interview:', error)
        }
    }

    const cleanup = () => {
        if (attentionIntervalRef.current) {
            clearInterval(attentionIntervalRef.current)
        }
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop())
        }
        stopSpeaking()
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        )
    }

    if (isComplete) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-teal-600 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Complete!</h1>
                    <p className="text-gray-600 mb-6">Thank you for completing the AI interview.</p>

                    {finalScore && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-teal-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-teal-700">{finalScore.overall_score}%</div>
                                <div className="text-sm text-gray-600">Overall Score</div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-700">{finalScore.attention_score}%</div>
                                <div className="text-sm text-gray-600">Attention Score</div>
                            </div>
                        </div>
                    )}

                    <Button onClick={() => router.push('/candidate/dashboard')} className="bg-teal-600 hover:bg-teal-700">
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                            LIVE
                        </Badge>
                        <div className="text-sm">
                            Question {questionNumber} of {totalQuestions}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-mono">{formatTime(timeRemaining)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {attentionData.faceDetected ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-red-400" />}
                            <span className="text-sm">{attentionData.attentionScore}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6 p-6 h-[calc(100vh-60px)]">

                {/* Camera Feed */}
                <div className="col-span-1">
                    <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h3 className="font-semibold">Your Camera</h3>
                            <Video className="h-4 w-4 text-teal-400" />
                        </div>
                        <div className="flex-1 relative bg-black">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover mirror"
                                muted
                                playsInline
                            />

                            {!attentionData.eyesOnScreen && attentionData.faceDetected && (
                                <div className="absolute top-4 left-4 right-4">
                                    <Alert className="bg-yellow-500/90 border-yellow-600">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-white">
                                            Please look at the screen
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {!attentionData.faceDetected && (
                                <div className="absolute top-4 left-4 right-4">
                                    <Alert className="bg-red-500/90 border-red-600">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-white">
                                            Face not detected
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </div>

                        <div className="p-4 space-y-2">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Tab Switches: {antiCheat.tabSwitches}</span>
                                <span>Exits: {antiCheat.fullscreenExits}</span>
                            </div>
                            <Progress value={attentionData.attentionScore} className="h-2" />
                        </div>
                    </Card>
                </div>

                {/* Question & Answer */}
                <div className="col-span-2 flex flex-col">
                    <Card className="bg-gray-800 border-gray-700 flex-1 flex flex-col">
                        <div className="p-6 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">AI Interviewer</h2>
                                {aiSpeaking && (
                                    <div className="flex items-center gap-2 text-teal-400">
                                        <Volume2 className="h-5 w-5 animate-pulse" />
                                        <span className="text-sm">Speaking...</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-lg text-gray-200 leading-relaxed">{currentQuestion}</p>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="bg-gray-900 rounded-lg p-4 min-h-[200px]">
                                <div className="text-sm text-gray-400 mb-2">Your Answer:</div>
                                <div className="text-gray-200">
                                    {transcript || <span className="text-gray-500 italic">Click the microphone to start answering...</span>}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-700">
                            <div className="flex items-center gap-4">
                                <Button
                                    size="lg"
                                    variant={audioRecorder.isRecording ? "destructive" : "default"}
                                    className={`flex-1 ${audioRecorder.isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                                    onClick={audioRecorder.isRecording ? stopRecording : startRecording}
                                    disabled={isSubmitting || aiSpeaking}
                                >
                                    {audioRecorder.isRecording ? (
                                        <>
                                            <MicOff className="h-5 w-5 mr-2" />
                                            Stop & Submit
                                        </>
                                    ) : (
                                        <>
                                            <Mic className="h-5 w-5 mr-2" />
                                            Start Answering
                                        </>
                                    )}
                                </Button>

                                {questionNumber === totalQuestions && !audioRecorder.isRecording && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={handleCompleteInterview}
                                        disabled={isSubmitting}
                                    >
                                        Finish Interview
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
        </div>
    )
}
