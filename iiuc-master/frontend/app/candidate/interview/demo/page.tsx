"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, PhoneOff, Video, VideoOff, Timer, Sparkles, User, Volume2, Maximize2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// --- Configuration ---
// Hardcoded key for demo reliability as requested ("no complicated shit")
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || ""
const ROLE_CONTEXT = "Junior React Developer"
const SYSTEM_PROMPT = `You are Sarah, a Senior React Engineer conducting a technical interview for a Junior React Developer role. 
Your goal is to assess the candidate's knowledge of React hooks, state management, and component lifecycle.
Keep your responses conversational, brief (under 2 sentences), and encouraging. 
Start by introducing yourself and asking the first question about React State.
After the candidate answers, provide very brief feedback and ask the next relevant question.
Do not write code blocks, just speak naturally.`

// --- Types ---
type InterviewState = "initializing" | "ai_speaking" | "listening" | "processing" | "completed"

export default function ImmersiveInterview() {
    const router = useRouter()
    // State
    const [started, setStarted] = useState(false)
    const [profileLoaded, setProfileLoaded] = useState(false)
    const [hasGreeted, setHasGreeted] = useState(false)
    const [status, setStatus] = useState<InterviewState>("initializing")
    const [userProfile, setUserProfile] = useState<any>(null)
    const [messages, setMessages] = useState<{ role: "system" | "user" | "assistant", content: string }[]>([{ role: "system", content: SYSTEM_PROMPT }])
    const [transcript, setTranscript] = useState("")
    const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes
    const [audioLevel, setAudioLevel] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(true)

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const messagesRef = useRef(messages)
    const statusRef = useRef(status)

    // VAD Refs
    const isSpeakingRef = useRef(false)
    const lastSpeechTimeRef = useRef(0)
    const silenceThreshold = 25 // 0-255

    // Sync refs
    useEffect(() => { messagesRef.current = messages }, [messages])
    useEffect(() => { statusRef.current = status }, [status])

    // Fetch user profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userStr = localStorage.getItem("user")
                if (!userStr) {
                    console.warn("No user found in localStorage")
                    setProfileLoaded(true)
                    return
                }

                const user = JSON.parse(userStr)
                const token = localStorage.getItem('access_token')

                console.log("[Profile] Fetching for user:", user.id)

                const res = await fetch(`http://localhost:5000/api/v1/profiles/candidate/${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (res.ok) {
                    const profileData = await res.json()
                    console.log("[Profile] Received:", profileData)

                    // Handle different response structures
                    const profile = profileData.data || profileData
                    setUserProfile(profile)

                    // Update system prompt with personalized, polite greeting
                    const personalizedPrompt = `You are Sarah, a Senior React Engineer conducting a technical interview for a Junior React Developer role.

FIRST MESSAGE (GREETING):
Start with: "Hello ${profile.first_name || 'there'}, how are you doing today? I'm Sarah, and I'll be conducting your interview for the Junior React Developer position. Shall we begin?"

AFTER CANDIDATE AGREES:
Keep your responses conversational, brief (1-2 sentences), and encouraging.
Ask relevant questions about React.
Provide brief feedback and ask follow-up questions.
Do not write code blocks, just speak naturally.
Be friendly and professional throughout.`

                    setMessages([{ role: "system", content: personalizedPrompt }])
                    setProfileLoaded(true)
                } else {
                    console.error("[Profile] API returned error:", res.status)
                    setProfileLoaded(true)
                }
            } catch (e) {
                console.error("[Profile] Failed to fetch:", e)
                setProfileLoaded(true)
            }
        }
        fetchProfile()
    }, [])

    // --- Initialization ---
    useEffect(() => {
        if (started && profileLoaded) {
            setupCamera()
            enterFullscreen()

            const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)

            // Start the interview interaction
            setTimeout(() => {
                startConversation()
            }, 1000)

            const handleFullscreenChange = () => {
                setIsFullscreen(!!document.fullscreenElement)
            }
            document.addEventListener("fullscreenchange", handleFullscreenChange)

            return () => {
                clearInterval(timer)
                if (mediaRecorderRef.current) mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
                window.speechSynthesis.cancel()
                document.removeEventListener("fullscreenchange", handleFullscreenChange)
            }
        }
    }, [started])

    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } catch (e) {
            console.error("Fullscreen blocked", e)
            setIsFullscreen(false)
        }
    }

    const setupCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                // Explicitly play to ensure preview shows
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.error("Play failed", e))
                }
            }

            // Setup Audio Context for visualization & VAD
            const audioContext = new AudioContext()
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)

            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            const updateAudioLevel = () => {
                analyser.getByteFrequencyData(dataArray)
                const average = dataArray.reduce((a, b) => a + b) / bufferLength
                setAudioLevel(average)

                // --- VAD Logic ---
                if (statusRef.current === "listening") {
                    if (average > silenceThreshold) {
                        isSpeakingRef.current = true
                        lastSpeechTimeRef.current = Date.now()
                    } else if (isSpeakingRef.current) {
                        // If silence for > 1.5s after speaking
                        if (Date.now() - lastSpeechTimeRef.current > 1500) {
                            isSpeakingRef.current = false
                            console.log("Auto-stopping based on silence")
                            stopListeningAndSubmit()
                        }
                    }
                }

                requestAnimationFrame(updateAudioLevel)
            }
            updateAudioLevel()

        } catch (err) {
            console.error("Camera access failed", err)
        }
    }

    // --- Logic Core ---

    const startConversation = async () => {
        // If we haven't greeted yet and have profile, greet first
        if (!hasGreeted && userProfile) {
            setHasGreeted(true)

            const greetingMessage = `Hello ${userProfile.first_name || 'there'}, how are you doing today? I'm Sarah, and I'll be conducting your interview for the Junior React Developer position. Shall we begin?`

            setMessages(prev => [...prev, { role: "assistant", content: greetingMessage }])
            await speakText(greetingMessage)
            startListening()
            return
        }

        // Normal conversation flow
        setStatus("processing")
        const aiResponse = await generateAIResponse(messagesRef.current)
        await speakText(aiResponse)
        startListening()
    }

    const generateAIResponse = async (history: any[]) => {
        try {
            // Filter out any messages with empty content to prevent 400 errors
            const validMessages = history.filter(m => m.content && m.content.trim() !== "");

            console.log("[AI] Sending messages:", validMessages);

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile", // Updated to latest stable model
                    messages: validMessages,
                    temperature: 0.6,
                    max_tokens: 150
                })
            })

            if (!response.ok) {
                const errBody = await response.text();
                console.error(`[AI] API Error ${response.status}:`, errBody);
                return "I'm having some technical trouble. Let's move to the next question.";
            }

            const data = await response.json()
            const content = data.choices?.[0]?.message?.content || "Could you repeat that?"

            console.log("[AI] Response:", content);
            setMessages(prev => [...prev, { role: "assistant", content }])
            return content
        } catch (e) {
            console.error("[AI] Generation failed", e)
            return "I'm having trouble connecting. Let's try again."
        }
    }

    const speakText = (text: string): Promise<void> => {
        return new Promise((resolve) => {
            if (!text) {
                resolve();
                return;
            }

            const startSpeaking = () => {
                setStatus("ai_speaking")
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.rate = 1.0
                utterance.pitch = 1.0
                utterance.volume = 1.0

                const voices = window.speechSynthesis.getVoices()
                // Find best English voice
                const preferred = voices.find(v =>
                    v.lang.startsWith("en-") && (
                        v.name.includes("Google") ||
                        v.name.includes("Microsoft") ||
                        v.name.includes("Samantha") ||
                        v.name.includes("Female")
                    )
                ) || voices.find(v => v.lang.startsWith("en-")) || voices[0]

                if (preferred) {
                    utterance.voice = preferred
                    console.log("[TTS] Using voice:", preferred.name);
                }

                console.log("[TTS] Speaking:", text.substring(0, 60) + "...");

                utterance.onstart = () => {
                    console.log("[TTS] Speech started");
                }

                utterance.onend = () => {
                    console.log("[TTS] Speech finished");
                    setTimeout(resolve, 500);
                }

                utterance.onerror = (e) => {
                    console.error("[TTS] Speech error:", e.error);
                    setTimeout(resolve, 300);
                }

                // CRITICAL FIX: Do NOT call cancel() before speak() - it causes errors
                window.speechSynthesis.speak(utterance)
            }

            // Ensure voices are loaded (Chrome loads them async)
            const voices = window.speechSynthesis.getVoices()
            if (voices.length === 0) {
                console.log("[TTS] Waiting for voices...");
                window.speechSynthesis.onvoiceschanged = () => {
                    console.log("[TTS] Voices loaded:", window.speechSynthesis.getVoices().length);
                    startSpeaking();
                }
            } else {
                startSpeaking();
            }
        })
    }

    const startListening = async () => {
        setStatus("listening")
        setTranscript("")
        isSpeakingRef.current = false

        try {
            // Re-acquire stream for purity or reuse? Reuse is fine but fresh recorder is checking
            // We already have stream from setupCamera logic, but MediaRecorder needs stream.
            // We can use the videoRef stream tracks?
            let stream = videoRef.current?.srcObject as MediaStream
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            }

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.start()

        } catch (e) {
            console.error("Mic failed", e)
        }
    }

    // Define as steady function using refs
    const stopListeningAndSubmit = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return
        if (statusRef.current !== "listening") return

        setStatus("processing")
        mediaRecorderRef.current.stop()

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
            if (audioBlob.size < 1000) {
                // Too short, restart listening
                startListening()
                return
            }

            // 1. Transcribe
            const text = await transcribeAudio(audioBlob)
            setTranscript(text)
            setMessages(prev => [...prev, { role: "user", content: text }])

            // 2. Generate AI Reply with updated history
            const currentHistory = [...messagesRef.current, { role: "user", content: text }]
            const aiReply = await generateAIResponse(currentHistory)

            // 3. Speak Reply
            await speakText(aiReply)

            // 4. Loop back to Listen
            startListening()
        }
    }

    const transcribeAudio = async (blob: Blob) => {
        try {
            if (blob.size < 100) {
                console.warn("[Transcribe] Audio blob too small:", blob.size);
                return "";
            }

            const formData = new FormData()
            formData.append('file', blob, 'audio.webm')
            formData.append('model', 'whisper-large-v3-turbo')
            formData.append('temperature', '0')
            formData.append('response_format', 'json')

            console.log(`[Transcribe] Sending ${blob.size} bytes to Groq...`);

            const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
                body: formData
            })

            if (!res.ok) {
                console.error(`[Transcribe] API Error ${res.status}:`, await res.text());
                return "";
            }

            const data = await res.json()
            console.log("[Transcribe] Result:", data);

            const text = data.text?.trim();
            if (!text) {
                console.warn("[Transcribe] Received empty text");
                return "";
            }
            return text;

        } catch (e) {
            console.error("[Transcribe] Request failed", e)
            return ""
        }
    }

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60)
        const secs = s % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleExit = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error(err))
        }
        window.speechSynthesis.cancel()
        // Stop all tracks
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
        }
        router.push('/candidate/interview')
    }

    if (!started) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <div className="relative z-10 max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl shadow-2xl text-center">
                    <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Mic className="w-10 h-10 text-teal-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Voice Interview</h1>
                    <p className="text-zinc-400 mb-8">
                        Immersive AI-driven technical interview for
                        <span className="text-teal-400 font-semibold block mt-1">{ROLE_CONTEXT}</span>
                    </p>
                    <Button
                        onClick={() => setStarted(true)}
                        disabled={!profileLoaded}
                        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-6 text-lg rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {profileLoaded ? 'Start Interview' : 'Loading Profile...'}
                    </Button>
                    <p className="text-xs text-zinc-500 mt-4">Microphone & Camera access required</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden font-sans text-gray-900">

            {/* 1. Background Video (User) */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-30 transform scale-x-[-1] blur-sm"
            />

            {/* Fullscreen Warning Only if Started */}
            {!isFullscreen && started && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center text-center p-8">
                    <div className="space-y-4">
                        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-white">Interrupted</h2>
                        <p className="text-zinc-400">Please enable fullscreen to continue the interview.</p>
                        <Button onClick={enterFullscreen} className="bg-white text-black hover:bg-zinc-200 font-bold">
                            Resume Interview
                        </Button>
                    </div>
                </div>
            )}

            {/* PiP View - Moved to bottom left */}
            <div className="absolute bottom-24 left-8 z-30 w-48 h-36 rounded-2xl overflow-hidden border-2 border-gray-300 shadow-2xl bg-gray-200">
                <video
                    ref={videoRef}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <User className="text-gray-400 w-12 h-12" />
                </div>
                <div className="absolute bottom-2 left-2 text-xs font-bold text-gray-900 bg-white/80 px-2 py-1 rounded">YOU</div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />

            {/* 2. Header - Redesigned */}
            <div className="relative z-10 p-6 flex justify-between items-start">
                {/* Left: Exit Button */}
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleExit}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 backdrop-blur-md transition-all px-6 py-3 rounded-2xl group"
                >
                    <PhoneOff className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                    <span className="font-semibold">Exit Interview</span>
                </Button>

                {/* Center: Logo with Glow */}
                <div className="absolute left-1/2 top-6 transform -translate-x-1/2">
                    <div className="relative">
                        {/* Glowing orb */}
                        <div className="absolute inset-0 bg-teal-500/30 blur-2xl rounded-full animate-pulse" />
                        <div className="relative bg-gradient-to-br from-teal-400 to-emerald-500 p-4 rounded-2xl shadow-2xl border border-teal-300/30">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-white/90 font-bold text-sm tracking-wider">AI INTERVIEWER</p>
                        <p className="text-teal-400 text-xs font-medium">Sarah • Senior Engineer</p>
                    </div>
                </div>

                {/* Right: Timer */}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-lg">
                        <Timer className="w-5 h-5 text-teal-400 animate-pulse" />
                        <span className="font-mono text-2xl font-bold text-white">{formatTime(timeLeft)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-emerald-400/30">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold tracking-wide text-emerald-300">RECORDING</span>
                    </div>
                </div>
            </div>

            {/* 3. Main Interaction Area */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">

                {/* AI Avatar / Status */}
                <div className="mb-12 relative">
                    {status === "ai_speaking" && (
                        <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping duration-[2000ms]" />
                    )}

                    <div className={`
             w-40 h-40 rounded-full flex items-center justify-center
             transition-all duration-500 shadow-2xl relative overflow-hidden
             ${status === "listening" ? "scale-110 border-4 border-white/50 bg-black/60" : "bg-gradient-to-br from-teal-500 to-emerald-600"}
           `}>
                        {status === "listening" ? (
                            <div className="flex items-center gap-1 h-12">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-3 bg-white rounded-full bg-gradient-to-t from-teal-400 to-white"
                                        animate={{ height: Math.max(15, audioLevel * (Math.random() * 2.5)) }}
                                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-white animate-[spin_5s_linear_infinite] opacity-80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                        )}
                    </div>

                    <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <span className="bg-black/50 backdrop-blur px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-white/90 border border-white/10 shadow-lg">
                            {status === "ai_speaking" && "AI Speaking..."}
                            {status === "listening" && "Listening..."}
                            {status === "processing" && "Thinking..."}
                            {status === "initializing" && "Connecting..."}
                        </span>
                    </div>
                </div>

                {/* Captions / Transcript - Improved */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={messages.length + status}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-5xl min-h-[120px] px-8"
                    >
                        <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-3xl p-8 shadow-xl">
                            <h2 className="text-2xl md:text-4xl font-bold leading-relaxed text-gray-900 text-center">
                                {status === "ai_speaking"
                                    ? messages[messages.length - 1]?.content
                                    : transcript || (status === "listening" ? "Listening to your response..." : "Processing...")}
                            </h2>
                            {userProfile && status === "listening" && (
                                <p className="text-center text-gray-600 text-sm mt-4 font-medium">
                                    Hi {userProfile.first_name}, speak clearly and take your time.
                                </p>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

            </div>

            {/* 4. Bottom Controls - Simplified */}
            <div className="fixed bottom-0 left-0 right-0 p-8 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                <div className="flex items-center justify-center gap-8 pointer-events-auto">
                    {/* Main Mic Indicator */}
                    {status === "listening" ? (
                        <div className="flex flex-col items-center gap-3">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-teal-500/50 border-4 border-white/20"
                            >
                                <Mic className="h-10 w-10 text-white" />
                            </motion.div>
                            <div className="text-center">
                                <p className="text-white font-bold text-sm">Mic Active</p>
                                <p className="text-teal-300/60 text-xs">Auto-detect enabled</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-20 w-20 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center opacity-40">
                            <Mic className="h-8 w-8 text-zinc-500" />
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}
