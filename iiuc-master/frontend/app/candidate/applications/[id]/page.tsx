
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { applicationsAPI, interviewAPI } from "@/lib/api"
import { CommonNavbar } from "@/components/common-navbar"
import { useLanguage } from "@/components/language-provider"
import {
    Briefcase,
    MapPin,
    Building2,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    MessageSquare,
    Video,
    FileText,
    ChevronRight,
    TrendingUp,
    DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ApplicationDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { t } = useLanguage()
    const [application, setApplication] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [startingChat, setStartingChat] = useState(false)

    useEffect(() => {
        loadApplication()
    }, [params.id])

    const loadApplication = async () => {
        try {
            // In a real app, you would fetch a specific application by ID
            // For now, we fetch all and find the one matching the ID
            const response = await applicationsAPI.getCandidateApplications()
            const app = response.data.applications.find((a: any) => a.id === params.id)

            if (!app) {
                setError("Application not found")
                return
            }

            setApplication(app)
        } catch (err: any) {
            console.error("Error loading application:", err)
            setError("Failed to load application details")
        } finally {
            setLoading(false)
        }
    }

    const handleStartChat = async () => {
        try {
            setStartingChat(true)
            // Initiate or get conversation
            await interviewAPI.getOrCreateConversation(application.id)

            // Redirect to inbox
            router.push('/candidate/inbox')
        } catch (error) {
            console.error('Failed to start chat:', error)
        } finally {
            setStartingChat(false)
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                bounce: 0.4
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[120px] animate-pulse" />
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <Loader2 className="h-12 w-12 text-teal-600 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Loading Application...</p>
                </div>
            </div>
        )
    }

    if (error || !application) {
        return (
            <div className="min-h-screen bg-[#F0FDF4]">
                <CommonNavbar />
                <div className="container mx-auto px-6 py-20 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">{error || "Application Not Found"}</h2>
                    <Button onClick={() => router.push('/candidate/dashboard')}>Back to Dashboard</Button>
                </div>
            </div>
        )
    }

    const status = application.status?.toLowerCase() || 'applied'
    const isInterview = status === 'interviewing'

    return (
        <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden text-slate-900 font-sans selection:bg-teal-200 selection:text-teal-900">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[100px] opacity-50" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px] opacity-50" />
            </div>

            <div className="relative z-10">
                <CommonNavbar />

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl"
                >
                    {/* Breadcrumb / Back Navigation */}
                    <motion.div variants={itemVariants} className="mb-6">
                        <Link href="/candidate/dashboard" className="flex items-center text-slate-500 hover:text-teal-600 transition-colors w-fit">
                            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                            <span className="font-medium">Back to Applications</span>
                        </Link>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Main Info */}
                        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">

                            {/* Header Card */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                                <div className="flex flex-col md:flex-row gap-6 md:items-start relative z-10">
                                    <div className="h-24 w-24 rounded-2xl bg-white border border-teal-100 shadow-sm flex items-center justify-center p-4">
                                        {application.jobs?.recruiter_profiles?.company_logo_url ? (
                                            <img src={application.jobs.recruiter_profiles.company_logo_url} alt="Logo" className="h-full w-full object-contain" />
                                        ) : (
                                            <Building2 className="h-10 w-10 text-teal-200" />
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{application.jobs?.job_title}</h1>
                                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 className="h-4 w-4 text-teal-500" />
                                                        {application.jobs?.recruiter_profiles?.company_name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-4 w-4 text-teal-500" />
                                                        {application.jobs?.city}, {application.jobs?.country}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Briefcase className="h-4 w-4 text-teal-500" />
                                                        {application.jobs?.job_type}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`px-4 py-2 rounded-full text-sm font-bold border ${status === 'interviewing' ? 'bg-teal-100 text-teal-700 border-teal-200' :
                                                status === 'hired' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {status.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress/Timeline Strips */}
                                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-4 gap-2">
                                    {['applied', 'viewed', 'interviewing', 'offer'].map((step, i) => {
                                        const steps = ['applied', 'viewed', 'interviewing', 'hired']
                                        const currentIdx = steps.indexOf(status)
                                        const stepIdx = i // 0,1,2,3
                                        const isActive = currentIdx >= stepIdx

                                        return (
                                            <div key={step} className="flex flex-col gap-2">
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-1000 ${isActive ? 'bg-teal-500' : 'bg-slate-100'}`} />
                                                <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-teal-600' : 'text-slate-300'}`}>
                                                    {step === 'offer' ? 'Hired' : step}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Action Required / Next Steps */}
                            {isInterview && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-teal-900/10"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Video className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">Interview Scheduled</h3>
                                            <p className="text-teal-50 mb-6 max-w-xl leading-relaxed">
                                                Congratulations! You have moved to the interview stage. Please check your inbox for messages from the recruiter to coordinate time details.
                                            </p>
                                            <div className="flex gap-4">
                                                <Button
                                                    onClick={handleStartChat}
                                                    disabled={startingChat}
                                                    className="bg-white text-teal-700 hover:bg-teal-50 border-0 font-bold"
                                                >
                                                    {startingChat ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                    )}
                                                    Message Recruiter
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="bg-transparent border-white/30 text-white hover:bg-white/10"
                                                    onClick={() => window.open(application.jobs.external_url || '#', '_blank')}
                                                >
                                                    View Job Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Application Details */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-teal-500" />
                                    Application Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Applied On</span>
                                        <p className="font-semibold text-slate-900">
                                            {new Date(application.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Used</span>
                                        <p className="font-semibold text-slate-900">{application.email || "N/A"}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Cover Letter</span>
                                        <div className="bg-slate-50 rounded-xl p-4 text-slate-600 text-sm leading-relaxed border border-slate-100">
                                            {application.cover_letter || "No cover letter submitted."}
                                        </div>
                                    </div>
                                    {application.resume_url && (
                                        <div className="md:col-span-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Resume</span>
                                            <a
                                                href={application.resume_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <FileText className="h-4 w-4" />
                                                View Resume
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Sidebar - Job Summary */}
                        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-24">
                                <h3 className="font-bold text-slate-900 mb-4">Job Snapshot</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                                        <DollarSign className="h-5 w-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Salary</p>
                                            <p className="font-semibold text-slate-900">
                                                {application.jobs?.salary_min ? `$${application.jobs.salary_min.toLocaleString()}` : 'Not disclosed'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                                        <TrendingUp className="h-5 w-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Experience</p>
                                            <p className="font-semibold text-slate-900">{application.jobs?.experience_level || 'Not specified'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                                        <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Job Type</p>
                                            <p className="font-semibold text-slate-900">{application.jobs?.work_mode} • {application.jobs?.job_type}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h4 className="font-bold text-slate-900 mb-2">About Company</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-4">
                                        {application.jobs?.recruiter_profiles?.company_name} is a great place to work.
                                    </p>
                                    <Link href={`/candidate/jobs/${application.job_id}`} className="inline-block mt-3 text-sm font-bold text-teal-600 hover:text-teal-700">
                                        View Full Job Posting
                                    </Link>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </motion.div>
            </div>
        </div>
    )
}
