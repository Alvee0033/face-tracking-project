"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Bot, Calendar, Clock, ArrowRight, Play, CheckCircle,
    Loader2, Plus, Sparkles, AlertCircle, Video
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDate } from "@/lib/utils"
import { videoCallAPI } from "@/lib/api"
import { InterviewTimer } from "@/components/interview-timer"

export default function AIInterviewDashboard() {
    const router = useRouter()
    const [mockInterviews, setMockInterviews] = useState<any[]>([])
    const [recruiterInterviews, setRecruiterInterviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [candidateId, setCandidateId] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const userStr = localStorage.getItem("user")
            if (!userStr) {
                router.push('/login')
                return
            }

            const user = JSON.parse(userStr)
            const token = localStorage.getItem('access_token')

            // Fetch Recruiter Scheduled Interviews (using our dedicated API)
            // Note: Use a catch so one failure doesn't block the other
            const scheduledPromise = videoCallAPI.getScheduledInterviews().catch(err => {
                console.error("Failed to fetch scheduled interviews:", err)
                return { data: { interviews: [] } }
            })

            // Get Candidate ID and mock interviews
            const profileRes = await fetch(`http://localhost:5000/api/v1/profiles/candidate/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(e => null)

            let cId = null
            if (profileRes && profileRes.ok) {
                const profileData = await profileRes.json()
                cId = profileData.data?.id
                setCandidateId(cId)
            }

            let mocksPromise = Promise.resolve([])
            if (cId) {
                mocksPromise = fetch(`http://localhost:5000/api/v1/ai-interviews/candidate/${cId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => data.success ? data.data.interviews : [])
                    .catch(e => [])
            }

            const [scheduledRes, mocksRes] = await Promise.all([scheduledPromise, mocksPromise])

            // Fetch "Legacy" / "Quick Assigned" AI Interviews (Schema A)
            // These are created by the "Quick Assign" feature for recruiters
            let assignedInterviews: any[] = []
            try {
                const assignedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-interviews/my-interviews`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (assignedRes.ok) {
                    const assignedData = await assignedRes.json()
                    assignedInterviews = (assignedData.interviews || []).map((session: any) => ({
                        id: session.id,
                        created_at: session.created_at,
                        status: session.status,
                        // Map Schema A fields to Schema B structure for UI compatibility
                        jobs: {
                            title: session.template?.title || session.application?.job?.job_title || "Assigned Interview",
                            department: session.application?.job?.department,
                            company_name: session.application?.job?.recruiter?.company_name
                        },
                        // Flag to distinguish source if needed, though structure masking handles most
                        is_assigned_schema_a: true,
                        template_id: session.template_id
                    }))
                }
            } catch (e) {
                console.error("Failed to fetch assigned interviews (Schema A):", e)
            }

            setRecruiterInterviews(scheduledRes.data?.interviews || [])
            setMockInterviews([...mocksRes, ...assignedInterviews])

        } catch (err) {
            console.error(err)
            setError("Failed to load dashboard data")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F0FDF4] p-6 md:p-12 font-inter relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-6xl mx-auto space-y-10 relative z-10">
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Interview Dashboard</h1>
                    <p className="text-slate-500 font-medium">Manage your interviews and preparation.</p>
                </header>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

                    {/* LEFT COLUMN: UPCOMING SCHEDULE */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Review Scheduled Interviews
                            </h2>
                            <p className="text-sm text-slate-500">Upcoming sessions with recruiters.</p>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                </div>
                            ) : recruiterInterviews.length === 0 ? (
                                <Card className="p-8 text-center border-dashed border-2 border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl">
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-blue-500">
                                        <Calendar className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">No interviews yet</h3>
                                    <p className="text-slate-500 text-sm mt-1">When recruiters schedule interviews, they will appear here.</p>
                                </Card>
                            ) : (
                                recruiterInterviews.map((interview: any) => (
                                    <Card key={interview.id} className="group overflow-hidden border-0 shadow-lg shadow-blue-900/5 bg-white rounded-2xl ring-1 ring-slate-100">
                                        <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                                                        {interview.job_title || interview.title || "Interview Session"}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 font-medium mt-1">
                                                        {interview.company_name || "Company Interview"}
                                                    </p>
                                                </div>
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
                                                    Scheduled
                                                </Badge>
                                            </div>

                                            {/* Timer Section */}
                                            <div className="mb-6 bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Starts In</div>
                                                <InterviewTimer targetDate={interview.scheduled_at} />
                                            </div>

                                            <div className="flex items-center justify-between text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Calendar className="h-4 w-4 text-blue-500" />
                                                    {formatDate(interview.scheduled_at)}
                                                </div>
                                                <div className="w-px h-4 bg-slate-300" />
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Clock className="h-4 w-4 text-indigo-500" />
                                                    video call
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 group-hover:scale-[1.02] transition-all"
                                                onClick={() => {
                                                    // Construct meeting link (assuming simplified format matching recruiter side)
                                                    const channel = interview.channel_name || `int-${interview.id.slice(0, 8)}`
                                                    // Here we would ideally use the 'candidate' join page, but for now reuse video-call page or direct jitsi
                                                    // Since we don't have separate candidate video page logic, let's link to the same page but maybe different params?
                                                    // Or better, just link to Jitsi directly if we stored it?
                                                    // Wait, the recruiter generated a hardcoded Jitsi link in the email, but stored only metadata in DB.
                                                    // We need to regenerate the expected room name.
                                                    // Let's use the channel_name from DB if available.
                                                    const roomName = interview.channel_name || `interview-default`
                                                    window.open(`https://meet.jit.si/${roomName}`, '_blank')
                                                }}
                                            >
                                                <Video className="mr-2 h-5 w-5" />
                                                Join Video Call
                                            </Button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>


                    {/* RIGHT COLUMN: AI MOCK INTERVIEW */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-teal-600" />
                                AI Mock Interviews
                            </h2>
                            <p className="text-sm text-slate-500">Practice and refine your skills.</p>
                        </div>

                        <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 text-white p-8 rounded-[2rem] group cursor-pointer transition-all hover:scale-[1.01]"
                            onClick={() => window.location.href = '/candidate/interview/demo'}>
                            {/* Background Effects */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />

                            <div className="relative z-10 space-y-6">
                                <div className="flex justify-between items-start">
                                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-md px-3 py-1 text-xs font-bold tracking-wider">
                                        POPULAR
                                    </Badge>
                                    <Bot className="h-8 w-8 text-white/80" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black leading-tight">Practice with AI</h3>
                                    <p className="text-teal-100 text-lg font-medium">Voice-enabled immersive interview simulation.</p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                                        <Clock className="h-4 w-4 text-teal-300" />
                                        <span className="text-sm font-bold">15 min</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                                        <Bot className="h-4 w-4 text-teal-300" />
                                        <span className="text-sm font-bold">Real-time Feedback</span>
                                    </div>
                                </div>

                                <Button className="w-full bg-white text-teal-900 hover:bg-teal-50 font-bold h-14 text-lg shadow-lg mt-4 group-hover:shadow-white/20 transition-all rounded-xl">
                                    Start Mock Interview
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </Card>

                        {/* Mock History List */}
                        <div className="space-y-3 pt-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Past Mock Sessions</h3>
                            {mockInterviews.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No past sessions.</p>
                            ) : (
                                mockInterviews.map((mock: any) => (
                                    <div key={mock.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-teal-200 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">
                                                {mock.jobs?.title || 'General Practice'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {formatDate(mock.created_at)}
                                            </div>
                                        </div>

                                        {mock.status === 'completed' ? (
                                            <Button size="sm" variant="ghost" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-bold text-xs" disabled>
                                                View Report
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                                                onClick={() => {
                                                    // Determine route based on schema type
                                                    if (mock.is_assigned_schema_a) {
                                                        // Route for Schema A (Quick Assign) sessions
                                                        router.push(`/candidate/interview/session/${mock.id}`)
                                                    } else {
                                                        // Route for Schema B (AI Mock)
                                                        router.push(`/candidate/interview/${mock.id}`)
                                                    }
                                                }}
                                            >
                                                Start
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
