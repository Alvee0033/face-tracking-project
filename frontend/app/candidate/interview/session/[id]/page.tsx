"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Mic, MicOff, Volume2, Timer, CheckCircle, Loader2, Video, AlertCircle, Eye, EyeOff, Clock, Play
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

export default function AssignedInterviewSessionPage() {
    const params = useParams()
    const router = useRouter()
    const sessionId = params.id as string

    // State
    const [hasStarted, setHasStarted] = useState(false)
    const [session, setSession] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [transcript, setTranscript] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(1800) // 30 mins default
    const [isComplete, setIsComplete] = useState(false)
    const [aiSpeaking, setAiSpeaking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isInitializing, setIsInitializing] = useState(false)

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const recognitionRef = useRef<any>(null)

    // Hooks
    const attentionData = useMediaPipeAttention(videoRef.current)
    const { speak, stop: stopSpeaking, voices } = useTextToSpeech()
    const audioRecorder = useAudioRecorder()
    const antiCheat = useAntiCheat({
        enforceFullscreen: true,
        onViolation: (type) => console.warn(`Violation: ${type}`)
    })

    // Timer
    useEffect(() => {
        if (hasStarted && session && !isComplete) {
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
    }, [hasStarted, session, isComplete])

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup()
    }, [])

    const initializeInterview = async () => {
        setIsInitializing(true)
        try {
            // 1. Request Fullscreen
            await antiCheat.enterFullscreen()

            // 2. Setup Camera
            await setupCamera()

            // 3. Start Interview Session
            await startInterviewSession()

            // 4. Setup Speech
            setupSpeechRecognition()

            setHasStarted(true)
        } catch (err: any) {
            console.error("Initialization failed:", err)
            setError(err.message || "Failed to start interview")
        } finally {
            setIsInitializing(false)
        }
    }

    const startInterviewSession = async () => {
        const token = localStorage.getItem('access_token')
        // Schema A endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/sessions/${sessionId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            throw new Error(errData.message || "Failed to start interview session")
        }

        const data = await response.json()
        if (data.session) {
            setSession(data.session)

            let loadedQuestions = []
            if (data.session.questions?.questions) {
                loadedQuestions = data.session.questions.questions
            } else if (data.session.template?.questions) {
                loadedQuestions = data.session.template.questions
            }

            // Sort by order_index
            loadedQuestions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

            if (loadedQuestions.length === 0) {
                throw new Error("No questions found for this interview.")
            } else {
                setQuestions(loadedQuestions)
                // Speak first question
                setTimeout(() => {
                    speakQuestion(loadedQuestions[0].question_text)
                }, 1000)
            }
        }
    }

    const setupCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }, // Request higher resolution for desktop
                audio: false
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                // Ensure it plays
                try {
                    await videoRef.current.play()
                } catch (e) {
                    console.error("Video play failed:", e)
                }
            }
        } catch (error) {
            console.error('Camera access denied:', error)
            throw new Error("Camera access is required. Please allow camera permissions.")
        }
    }

    const setupSpeechRecognition = () => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
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

        // Find a female voice
        const femaleVoice = voices.find(voice =>
            voice.name.includes("Female") ||
            voice.name.includes("female") ||
            voice.name.includes("Zira") ||
            voice.name.includes("Samantha") ||
            voice.name.includes("Google US English")
        ) || null

        speak(question, {
            rate: 1.0,
            pitch: 1.0,
            voice: femaleVoice as SpeechSynthesisVoice,
            onEnd: () => setAiSpeaking(false)
        })
    }

    const startRecording = async () => {
        setTranscript("")
        if (recognitionRef.current) recognitionRef.current.start()
        await audioRecorder.startRecording()
    }

    const stopRecording = () => {
        if (recognitionRef.current) recognitionRef.current.stop()
        audioRecorder.stopRecording()
        // Delay slightly for processing
        setTimeout(handleSubmitAnswer, 500)
    }

    const handleSubmitAnswer = async () => {
        if (!transcript && !audioRecorder.audioBase64) return
        setIsSubmitting(true)

        try {
            const token = localStorage.getItem('access_token')
            const currentQ = questions[currentQuestionIndex]

            // Schema A endpoint: /responses
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/sessions/${sessionId}/responses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: currentQ.id,
                    transcriptionText: transcript || "Audio response provided",
                    responseDurationSeconds: 60 // placeholder
                })
            })

            if (response.ok) {
                audioRecorder.reset()
                setTranscript("")

                if (currentQuestionIndex < questions.length - 1) {
                    const nextIndex = currentQuestionIndex + 1
                    setCurrentQuestionIndex(nextIndex)
                    speakQuestion(questions[nextIndex].question_text)
                } else {
                    handleCompleteInterview()
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/sessions/${sessionId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            setIsComplete(true)
        } catch (error) {
            console.error('Failed to complete interview:', error)
        }
    }

    const cleanup = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop())
        }
        stopSpeaking()
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { })
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">
                <Alert variant="destructive" className="max-w-md bg-red-900/20 border-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                    <Button onClick={() => router.push('/candidate/interview')} className="mt-4 w-full" variant="outline">Back to Dashboard</Button>
                </Alert>
            </div>
        )
    }

    // Initial Start Screen
    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-gray-950 to-gray-950" />

                <Card className="max-w-2xl w-full p-10 bg-gray-900/80 border-gray-700 backdrop-blur-xl relative z-10 shadow-2xl rounded-2xl">
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-teal-500/30">
                            <Video className="h-10 w-10 text-teal-400" />
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 mb-3">
                                Ready for your Interview?
                            </h1>
                            <p className="text-gray-400 text-lg">
                                Please ensure your camera and microphone are working.
                                This session invites Fullscreen mode.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto py-6">
                            <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-gray-300">Camera Access</span>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-gray-300">Microphone</span>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-gray-300">Quiet Environment</span>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-gray-300">Stable Internet</span>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full h-16 text-xl font-bold bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-900/20 rounded-xl transition-all hover:scale-[1.02]"
                            onClick={initializeInterview}
                            disabled={isInitializing}
                        >
                            {isInitializing ? (
                                <>
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    Starting Session...
                                </>
                            ) : (
                                <>
                                    Start Interview Now
                                    <Play className="ml-2 h-6 w-6 fill-current" />
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    if (isComplete) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">
                <Card className="max-w-2xl w-full p-10 text-center shadow-2xl border-gray-700 bg-gray-900 rounded-2xl">
                    <div className="w-24 h-24 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-teal-500/30">
                        <CheckCircle className="h-12 w-12 text-teal-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">Interview Completed</h1>
                    <p className="text-xl text-gray-400 mb-8">Your responses have been recorded successfully. Validating proctoring data.</p>
                    <Button
                        onClick={() => router.push('/candidate/dashboard')}
                        size="lg"
                        className="bg-teal-600 hover:bg-teal-500 h-12 px-8 text-lg"
                    >
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    const currentQ = questions[currentQuestionIndex]

    return (
        <div className="h-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0 h-[72px] relative z-20">
                <div className="flex items-center gap-6">
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/50 animate-pulse px-3 py-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        LIVE SESSION
                    </Badge>
                    <span className="text-sm font-medium text-gray-300 border-l border-gray-700 pl-6">
                        <span className="text-teal-400 font-bold">Question {currentQuestionIndex + 1}</span>
                        <span className="text-gray-600 mx-1">/</span>
                        <span>{questions.length}</span>
                    </span>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 bg-gray-800/50 px-4 py-1.5 rounded-full border border-gray-700/50">
                        <Clock className="h-4 w-4 text-teal-400" />
                        <span className="font-mono font-bold text-lg tabular-nums tracking-widest text-teal-50">{formatTime(timeRemaining)}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${attentionData.faceDetected ? 'text-green-400' : 'text-red-400'}`}>
                        {attentionData.faceDetected ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        Attentive: {attentionData.attentionScore}%
                    </div>
                </div>
            </header>

            {/* Main Content Blueprint - Full Height Grid */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden max-h-[calc(100vh-72px)]">

                {/* LEFT: Camera & Status (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto">
                    <Card className="bg-black border-gray-800 relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 shrink-0 aspect-video">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover transform scale-x-[-1]"
                            autoPlay
                            muted
                            playsInline
                        />
                        {!attentionData.eyesOnScreen && attentionData.faceDetected && (
                            <div className="absolute top-4 left-0 right-0 flex justify-center z-10 transition-opacity duration-300">
                                <span className="bg-yellow-500/90 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                                    <AlertCircle className="h-3 w-3" /> Please look at the camera
                                </span>
                            </div>
                        )}
                        {!attentionData.faceDetected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                                <div className="text-center">
                                    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                                    <p className="text-red-400 font-bold">Face Not Detected</p>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                            Live Feed
                        </div>
                    </Card>

                    <Card className="bg-gray-900 border-gray-800 p-6 flex-1 shadow-lg ring-1 ring-white/5">
                        <h3 className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                            Session Details
                        </h3>
                        <div className="space-y-6">
                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                <div className="text-xs text-gray-500 mb-1">Topic</div>
                                <div className="font-semibold text-lg text-gray-200">{session?.template?.title || "General Interview"}</div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                    <span>Progress</span>
                                    <span>{Math.round(((currentQuestionIndex) / questions.length) * 100)}%</span>
                                </div>
                                <Progress value={((currentQuestionIndex) / questions.length) * 100} className="h-2 bg-gray-800 [&>div]:bg-teal-500" />
                            </div>

                            <div className="pt-4 border-t border-gray-800/50">
                                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase">Proctoring Status</h4>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Fullscreen Exits</span>
                                        <span className={`font-mono ${antiCheat.fullscreenExits > 0 ? 'text-yellow-500 font-bold' : 'text-green-500'}`}>{antiCheat.fullscreenExits}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Tab Switches</span>
                                        <span className={`font-mono ${antiCheat.tabSwitches > 0 ? 'text-yellow-500 font-bold' : 'text-green-500'}`}>{antiCheat.tabSwitches}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: Interaction Area (8 cols) */}
                <div className="lg:col-span-8 flex flex-col h-full gap-6 overflow-hidden">
                    <Card className="bg-gray-900 border-gray-800 flex-1 flex flex-col relative overflow-hidden shadow-2xl ring-1 ring-white/5 rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent pointer-events-none" />

                        {/* Question Display */}
                        <div className="p-8 md:p-10 border-b border-gray-800 shrink-0">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold border border-teal-500/20 shadow-[0_0_15px_-3px_rgba(45,212,191,0.2)]">
                                    {currentQuestionIndex + 1}
                                </div>
                                <h2 className="text-lg font-bold text-gray-400 tracking-tight">Current Question</h2>
                                {aiSpeaking && (
                                    <div className="ml-auto flex items-center gap-2 text-teal-400 bg-teal-950/30 px-3 py-1 rounded-full border border-teal-500/20">
                                        <Volume2 className="h-4 w-4 animate-pulse" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Speaking</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-2xl md:text-3xl text-gray-100 leading-tight font-light transition-all duration-300">
                                {currentQ?.question_text || "Loading question..."}
                            </p>
                        </div>

                        {/* Transcript / Answer Area - Scrollable */}
                        <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar bg-black/20">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 block flex items-center gap-2">
                                Your Response
                                {audioRecorder.isRecording && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                            </label>
                            <div className="text-lg text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                                {transcript || <span className="text-gray-600 italic">Click the microphone button below to start answering...</span>}
                            </div>
                        </div>

                        {/* Controls - Fixed at bottom */}
                        <div className="p-6 md:p-8 border-t border-gray-800 bg-gray-900/95 backdrop-blur-xl shrink-0">
                            <div className="flex items-center gap-4 max-w-3xl mx-auto">
                                <Button
                                    size="lg"
                                    className={`flex-1 text-lg h-16 rounded-xl transition-all shadow-lg hover:scale-[1.01] ${audioRecorder.isRecording
                                        ? 'bg-red-500 hover:bg-red-600 border-red-400 shadow-red-900/20'
                                        : 'bg-teal-600 hover:bg-teal-500 border-teal-500 shadow-teal-900/20'
                                        }`}
                                    onClick={audioRecorder.isRecording ? stopRecording : startRecording}
                                    disabled={isSubmitting || aiSpeaking}
                                >
                                    {audioRecorder.isRecording ? (
                                        <><MicOff className="mr-3 h-6 w-6" /> Stop Recording & Submit</>
                                    ) : (
                                        <><Mic className="mr-3 h-6 w-6" /> Start Answering</>
                                    )}
                                </Button>
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-4 font-medium">
                                {audioRecorder.isRecording ? "Listening... speak clearly" : "Press start to record your answer"}
                            </p>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
