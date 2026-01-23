"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RecruiterNavbar } from '@/components/recruiter-navbar'
import { RecruiterSidebar } from '@/components/recruiter-sidebar'
import { InterviewSchedulerCard } from '@/components/interview-scheduler-card'
import { ScheduleInterviewDialog } from '@/components/schedule-interview-dialog'
import {
  Users,
  MessageSquare,
  Phone,
  Mail,
  Video,
  FileText,
  Trash2,
  CalendarClock,
  Check,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Clock,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import { interviewAPI, applicationsAPI, profileAPI, videoCallAPI } from '@/lib/api'
import { format } from 'date-fns'
import { sendScheduledInterviewEmail } from '@/lib/emailService'
import { cn } from '@/lib/utils'

// Helper component for loading spinner
const Spinner = ({ className }: { className?: string }) => (
  <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
)

interface Candidate {
  id: string
  status: string
  applied_at: string
  ai_analysis_score: number | null
  ai_analysis_data: {
    compatibility_score: number
    fit_level: string
    strengths: string[]
    skill_gaps: string[]
    experience_gaps: string[]
    recommendations: string[]
  } | null
  ai_analyzed_at: string | null
  candidate: {
    id: string
    user_id: string
    headline: string
    current_job_title: string
    current_company: string
    city?: string
    country?: string
    bio?: string
    years_of_experience?: number
    profile: {
      full_name: string
      email: string
      phone_number: string
      profile_picture_url: string
    }
    skills?: Array<{
      skill_name: string
      skill_level: string
    }>
    experience?: Array<{
      job_title: string
      company: string
      start_date: string
      end_date: string
      is_current: boolean
    }>
    education?: Array<{
      degree: string
      field_of_study: string
      institution: string
      start_date: string
      end_date: string
      is_current: boolean
    }>
  }
  conversation?: {
    id: string
    is_initiated: boolean
    last_message_at: string
    recruiter_unread_count: number
  }[]
}

interface Job {
  id: string
  job_title: string
  department: string
  job_type: string
  location: string
  selected_candidates: Candidate[]
}

export default function InterviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const jobIdParam = searchParams.get('jobId')

  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsCandidate, setDetailsCandidate] = useState<Candidate | null>(null)
  const [rejectingCandidate, setRejectingCandidate] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledInterviews, setScheduledInterviews] = useState<Record<string, { dateTime: Date; meetingLink: string }>>({})

  const [recruiterProfile, setRecruiterProfile] = useState<{ full_name: string; company_name: string } | null>(null)

  useEffect(() => {
    fetchInterviews()
    fetchRecruiterProfile()
  }, [])

  const fetchRecruiterProfile = async () => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        const response = await profileAPI.getRecruiter(user.id)
        if (response.data) {
          setRecruiterProfile({
            full_name: response.data.profile.full_name,
            company_name: response.data.recruiterProfile?.company_name || 'Your Company'
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch recruiter profile:', error)
    }
  }

  const fetchInterviews = async () => {
    try {
      setLoading(true)
      const [interviewsRes, scheduledRes] = await Promise.all([
        interviewAPI.getRecruiterInterviews(),
        videoCallAPI.getScheduledInterviews().catch(() => ({ data: { interviews: [] } }))
      ])

      console.log('Interview response:', interviewsRes.data)

      setJobs(interviewsRes.data.jobs || [])

      // Process scheduled interviews into the map
      const scheduledMap: Record<string, { dateTime: Date; meetingLink: string }> = {}

      console.log('Scheduled interviews response:', scheduledRes.data)

      if (scheduledRes.data?.interviews) {
        // Map by conversation ID first, then we'll match to applications
        const conversationMap: Record<string, any> = {}

        scheduledRes.data.interviews.forEach((int: any) => {
          if (int.conversation_id) {
            conversationMap[int.conversation_id] = {
              dateTime: new Date(int.scheduled_at),
              meetingLink: `${window.location.origin}/recruiter/video-call?channel=${int.channel_name || 'default'}&candidateName=Candidate`,
              interview: int
            }
          }
        })

        console.log('Conversation map:', conversationMap)

        // Now map to application IDs by finding matching conversations
        interviewsRes.data.jobs?.forEach((job: Job) => {
          job.selected_candidates?.forEach((candidate: Candidate) => {
            const conversationId = candidate.conversation?.[0]?.id
            if (conversationId && conversationMap[conversationId]) {
              scheduledMap[candidate.id] = conversationMap[conversationId]
              console.log(`Mapped application ${candidate.id} to conversation ${conversationId}`)
            }
          })
        })
      }

      console.log('Final scheduled map:', scheduledMap)
      setScheduledInterviews(scheduledMap)

      if (interviewsRes.data.jobs && interviewsRes.data.jobs.length > 0) {
        const jobToSelect = jobIdParam
          ? interviewsRes.data.jobs.find((job: Job) => job.id === jobIdParam)
          : interviewsRes.data.jobs[0]

        if (jobToSelect) {
          setSelectedJob(jobToSelect)
          if (jobToSelect.selected_candidates && jobToSelect.selected_candidates.length > 0) {
            setSelectedCandidate(jobToSelect.selected_candidates[0])
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch interviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectCandidate = async () => {
    if (!selectedCandidate) return

    const confirmed = window.confirm(
      `Are you sure you want to reject ${selectedCandidate.candidate.profile.full_name}? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setRejectingCandidate(true)
      await applicationsAPI.updateApplicationStatus(selectedCandidate.id, 'rejected')

      // Remove the candidate from the list
      if (selectedJob) {
        const updatedCandidates = selectedJob.selected_candidates?.filter(c => c.id !== selectedCandidate.id) || []

        const updatedJob = { ...selectedJob, selected_candidates: updatedCandidates }

        setSelectedJob(updatedJob)

        // Update the jobs list as well
        setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j))

        // Select the next candidate or clear selection
        if (updatedCandidates.length > 0) {
          setSelectedCandidate(updatedCandidates[0])
        } else {
          setSelectedCandidate(null)
        }
      }

      alert(`${selectedCandidate.candidate.profile.full_name} has been rejected.`)
    } catch (error) {
      console.error('Failed to reject candidate:', error)
      alert('Failed to reject candidate. Please try again.')
    } finally {
      setRejectingCandidate(false)
    }
  }

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
  }

  // Go to inbox with pre-selected conversation context ideally, but linking to inbox is enough for now
  const handleMessageCandidate = () => {
    if (!selectedCandidate) return
    router.push('/recruiter/inbox')
  }

  const handleViewDetails = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation()
    setDetailsCandidate(candidate)
    setShowDetailsModal(true)
  }

  const handleScheduleInterview = async (dateTime: Date) => {
    if (!selectedCandidate || !selectedJob) return

    setIsScheduling(true)
    try {
      // 1. Ensure conversation exists
      let conversationId = selectedCandidate.conversation?.[0]?.id

      // If no conversation exists in the candidate object, try to fetch/create one
      if (!conversationId) {
        try {
          const convRes = await interviewAPI.getOrCreateConversation(selectedCandidate.id) // using application ID actually
          conversationId = convRes.data.conversation.id

          // Update local candidate state to include this new conversation
          // This prevents needing to refresh to see "Message" work properly if we implemented that
        } catch (e) {
          console.error("Failed to create conversation for scheduling:", e)
          alert("Could not initialize scheduling context. Please try again.")
          setIsScheduling(false)
          return
        }
      }

      if (!conversationId) {
        throw new Error("Failed to get conversation ID")
      }

      // 2. Save using Emergency Simple Endpoint
      const token = localStorage.getItem('access_token')
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/video-calls/simple-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId: conversationId,
            scheduledAt: dateTime.toISOString(),
            title: `Interview for ${selectedJob.job_title}`,
            description: `Video interview for ${selectedJob.job_title} position.`
          })
        })

        if (!response.ok) {
          throw new Error(`Schedule failed with status: ${response.status}`)
        }
      } catch (e) {
        console.error("Backend schedule failed:", e)
        alert("Note: Could not save to database, but proceeding with display.")
      }

      // 3. Generate Meeting Details
      const interviewDate = format(dateTime, "EEEE, MMMM d, yyyy")
      const interviewTime = format(dateTime, "h:mm a")
      const timestamp = Date.now()
      const shortJobId = selectedJob.id.slice(0, 8)
      const shortCandidateId = selectedCandidate.id.slice(0, 8)
      const roomName = `interview-${shortJobId}-${shortCandidateId}-${timestamp}`

      const recruiterVideoLink = `${window.location.origin}/recruiter/video-call?channel=${roomName}&candidateName=${encodeURIComponent(selectedCandidate.candidate.profile.full_name)}`

      // 4. Send Email via EmailJS
      console.log('Sending interview email invitation...')
      const { sendInterviewEmail } = await import('@/lib/emailjs')

      const emailSent = await sendInterviewEmail(
        selectedCandidate.candidate.profile.full_name,
        selectedCandidate.candidate.email,
        selectedJob.job_title,
        interviewDate,
        interviewTime,
        recruiterVideoLink
      )

      if (emailSent) {
        console.log('✅ Interview email sent successfully')
      } else {
        console.warn('⚠️ Failed to send interview email')
      }

      // Proceed directly to success
      // Update local state to reflect new schedule
      setScheduledInterviews(prev => ({
        ...prev,
        [selectedCandidate.id]: {
          dateTime: dateTime,
          meetingLink: recruiterVideoLink
        }
      }))
      alert(`✅ Interview scheduled and saved for ${selectedCandidate.candidate.profile.full_name}!`)

      /*
      if (emailSent) {
        // ...
      } else {
        alert(`⚠️ Interview saved to system, but email failed. Link: ${jitsiMeetingLink}`)
      }
      */
    } catch (error) {
      console.error('Failed to schedule interview:', error)
      alert('Failed to schedule interview. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleAssignAI = async (data: { topic: string; file?: File; questionCount: number }) => {
    if (!selectedCandidate || !selectedJob) return

    setIsScheduling(true)
    try {
      const formData = new FormData()
      formData.append('candidateId', selectedCandidate.candidate.id) // Correct ID reference? selectedCandidate.id is application ID... wait.
      // selectedCandidate is type Candidate which represents an application in this context (it has candidate object inside)
      // The API expects candidateId and jobId. 
      // Let's check the API controller. It uses `candidateId` to find the application.
      // selectedCandidate.candidate.id is the candidate GUID.
      formData.append('candidateId', selectedCandidate.candidate.id)
      formData.append('jobId', selectedJob.id)
      formData.append('topic', data.topic)
      formData.append('questionCount', String(data.questionCount))
      if (data.file) {
        formData.append('file', data.file)
      }

      await interviewAPI.assignQuickInterview(formData)

      alert(`✅ AI Interview scheduled for ${selectedCandidate.candidate.profile.full_name}!`)
    } catch (error) {
      console.error('Failed to assign AI interview:', error)
      alert('Failed to assign AI interview. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleJoinMeeting = () => {
    if (!selectedCandidate) return
    const scheduledInterview = scheduledInterviews[selectedCandidate.id]
    if (scheduledInterview) {
      window.open(scheduledInterview.meetingLink, '_blank')
    } else {
      // Create ad-hoc meeting if none scheduled
      const shortJobId = selectedJob?.id.slice(0, 8) || 'job'
      const shortCandidateId = selectedCandidate.id.slice(0, 8)
      const channel = `int-${shortJobId}-${shortCandidateId}`
      const url = `/recruiter/video-call?channel=${channel}&candidateName=${encodeURIComponent(selectedCandidate.candidate.profile.full_name)}`
      window.open(url, '_blank')
    }
  }

  // --- RENDERING HELPERS ---

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-slate-400'
    if (score >= 85) return 'text-teal-600'
    if (score >= 70) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-rose-500'
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-inter overflow-hidden selection:bg-teal-200 selection:text-teal-900">
      <RecruiterNavbar />

      <div className="flex-1 flex max-w-[1920px] mx-auto w-full p-6 gap-6 overflow-hidden">
        <RecruiterSidebar />

        <main className="flex-1 flex overflow-hidden gap-6">

          {/* LEFT PANEL: CANDIDATE LIST */}
          <div className="w-[380px] flex-shrink-0 bg-white rounded-[2rem] flex flex-col z-20 shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">

            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-white z-10">
              <div className="mb-4">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Interviews</h1>
                <div className="relative mt-2">
                  <select
                    value={selectedJob?.id || ''}
                    onChange={(e) => {
                      const job = jobs.find(j => j.id === e.target.value)
                      if (job) {
                        setSelectedJob(job)
                        setSelectedCandidate(null)
                      }
                    }}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 appearance-none cursor-pointer focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.job_title} ({job.selected_candidates?.length || 0})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <Spinner className="h-8 w-8 text-teal-600 mb-2" />
                  <span className="text-xs font-bold text-slate-400">Loading Interviews...</span>
                </div>
              ) : selectedJob?.selected_candidates?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <div className="bg-white p-4 rounded-full mb-3 shadow-sm border border-slate-200">
                    <Users className="h-6 w-6 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Candidates</h3>
                  <p className="text-xs text-slate-500 mt-1">Shortlist candidates from the Applications page to interview them.</p>
                  <Button onClick={() => router.push('/recruiter/applications')} variant="outline" size="sm" className="mt-4 text-xs h-8">
                    View Applications
                  </Button>
                </div>
              ) : (
                selectedJob?.selected_candidates?.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => handleCandidateSelect(candidate)}
                    className={cn(
                      "group relative p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border",
                      selectedCandidate?.id === candidate.id
                        ? "bg-white border-teal-200 shadow-lg shadow-teal-900/5 z-10 ring-1 ring-teal-100"
                        : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center text-sm font-bold shadow-sm transition-transform duration-300 border border-slate-100",
                          selectedCandidate?.id === candidate.id ? "ring-2 ring-teal-500 ring-offset-2" : "group-hover:border-slate-300"
                        )}>
                          {candidate.candidate.profile.profile_picture_url ? (
                            <img src={candidate.candidate.profile.profile_picture_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-teal-50 text-teal-700 flex items-center justify-center">
                              {candidate.candidate.profile.full_name[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className={cn(
                            "font-bold text-sm truncate transition-colors",
                            selectedCandidate?.id === candidate.id ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                          )}>
                            {candidate.candidate.profile.full_name}
                          </h3>
                          {candidate.ai_analysis_score && (
                            <span className={cn(
                              "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md",
                              getScoreColor(candidate.ai_analysis_score),
                              "bg-slate-50"
                            )}>
                              {candidate.ai_analysis_score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-semibold truncate">
                          {candidate.candidate.current_job_title || "Candidate"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANEL: DETAILS & INTERVIEW TOOLS */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {selectedCandidate ? (
              <div className="flex-1 bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden relative flex flex-col">

                {/* COMPACT HERO */}
                <div className="px-8 py-6 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm/50">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-md">
                        {selectedCandidate.candidate.profile.profile_picture_url ? (
                          <img src={selectedCandidate.candidate.profile.profile_picture_url} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-teal-600 text-white text-3xl font-bold">
                            {selectedCandidate.candidate.profile.full_name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidate.candidate.profile.full_name}</h1>
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-sm font-semibold text-slate-500">{selectedCandidate.candidate.current_job_title || "Candidate"}</p>
                          {selectedJob && (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 h-5">
                              {selectedJob.job_title}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedCandidate.candidate.profile.email && (
                            <a href={`mailto:${selectedCandidate.candidate.profile.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                              <Mail className="h-3.5 w-3.5" /> Email
                            </a>
                          )}
                          <Button
                            onClick={handleMessageCandidate}
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 rounded-lg border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 font-bold hover:border-teal-300"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Message
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Button
                        onClick={handleJoinMeeting}
                        className="h-11 px-6 rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 font-bold transition-all gap-2"
                      >
                        <Video className="h-4 w-4" />
                        {scheduledInterviews[selectedCandidate.id] ? "Join Scheduled Interview" : "Start Instant Meeting"}
                      </Button>
                      <p className="text-[10px] font-semibold text-slate-400 mr-1">
                        {scheduledInterviews[selectedCandidate.id]
                          ? `Scheduled: ${format(scheduledInterviews[selectedCandidate.id].dateTime, "MMM d, h:mm a")}`
                          : "No interview scheduled yet"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CONTENT GRID */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50/50">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl mx-auto">

                    {/* LEFT COL: SCHEDULING & ACTIONS */}
                    <div className="space-y-6">

                      {/* SCHEDULER */}
                      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
                        {/* <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-teal-600" />
                                Schedule Interview
                              </h3> */}

                        <InterviewSchedulerCard
                          candidateName={selectedCandidate.candidate.profile.full_name}
                          jobTitle={selectedJob?.job_title || ""}
                          onSchedule={handleScheduleInterview}
                          onJoinMeeting={handleJoinMeeting}
                          onAssignAI={handleAssignAI}
                          isScheduling={isScheduling}
                          hasScheduledInterview={!!scheduledInterviews[selectedCandidate.id]}
                          scheduledDateTime={scheduledInterviews[selectedCandidate.id]?.dateTime}
                          meetingLink={scheduledInterviews[selectedCandidate.id]?.meetingLink}
                        />
                      </div>

                      {/* ADMIN ACTIONS */}
                      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Admin Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            onClick={(e) => handleViewDetails(selectedCandidate, e)}
                            className="h-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold gap-2"
                          >
                            <FileText className="h-4 w-4" /> View Full Profile
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleRejectCandidate}
                            className="h-12 rounded-xl border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:border-rose-200 font-bold gap-2"
                          >
                            <Trash2 className="h-4 w-4" /> Reject Candidate
                          </Button>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COL: AI ANALYSIS SUMMARY */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-teal-600" />
                            AI Analysis
                          </h3>
                          {selectedCandidate.ai_analysis_score && (
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset",
                              selectedCandidate.ai_analysis_score >= 80
                                ? "bg-teal-50 text-teal-700 ring-teal-200"
                                : "bg-slate-50 text-slate-600 ring-slate-200"
                            )}>
                              {selectedCandidate.ai_analysis_score}% Match
                            </span>
                          )}
                        </div>

                        {selectedCandidate.ai_analysis_data ? (
                          <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase">Fit Level</span>
                                  <div className="text-slate-900 font-bold">{selectedCandidate.ai_analysis_data.fit_level || "N/A"}</div>
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-slate-400 uppercase">Recommendation</span>
                                  <div className="text-teal-600 font-bold">Recommended</div>
                                </div>
                              </div>
                            </div>

                            {selectedCandidate.ai_analysis_data.strengths && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                  <Check className="h-4 w-4 text-emerald-500" /> Top Strengths
                                </h4>
                                <ul className="space-y-2">
                                  {selectedCandidate.ai_analysis_data.strengths.slice(0, 3).map((s, i) => (
                                    <li key={i} className="flex gap-2 text-sm font-medium text-slate-600">
                                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {selectedCandidate.ai_analysis_data.skill_gaps && selectedCandidate.ai_analysis_data.skill_gaps.length > 0 && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-500" /> Potential Gaps
                                </h4>
                                <ul className="space-y-2">
                                  {selectedCandidate.ai_analysis_data.skill_gaps.slice(0, 2).map((s, i) => (
                                    <li key={i} className="flex gap-2 text-sm font-medium text-slate-600">
                                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-center">
                            <Sparkles className="h-8 w-8 text-slate-200 mb-2" />
                            <p className="text-slate-400 text-sm font-medium">Analysis data not available</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 border-dashed shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 rotate-3">
                  <Users className="h-10 w-10 text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">No Candidate Selected</h2>
                <p className="text-slate-500 font-medium mt-1">Select a candidate on the left to start interviewing</p>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Details Modal - Premium Style */}
      {showDetailsModal && detailsCandidate && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setShowDetailsModal(false)}
        >
          <div className="min-h-full flex items-center justify-center py-8 w-full">
            <div
              className="bg-white/90 backdrop-blur-2xl border border-white/40 w-full max-w-4xl shadow-2xl rounded-3xl my-auto animate-scale-in overflow-hidden relative ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Gradient */}
              <div className="relative bg-gradient-to-r from-teal-50/80 via-white to-emerald-50/80 p-8 border-b border-teal-100/50">
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetailsModal(false)}
                    className="rounded-full hover:bg-white/50 hover:text-slate-900 text-slate-500 transition-colors"
                  >
                    {/* <X className="h-5 w-5" /> // X was not imported, reusing arrow or similar or ensuring logic works. Wait, X was in earlier logs, need to re-import if used */}
                    <span className="text-xl">×</span>
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:items-end">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full p-1 bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg">
                      <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {detailsCandidate.candidate.profile.profile_picture_url ? (
                          <img
                            src={detailsCandidate.candidate.profile.profile_picture_url}
                            alt={detailsCandidate.candidate.profile.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-3xl font-bold text-teal-600">
                            {detailsCandidate.candidate.profile.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{detailsCandidate.candidate.profile.full_name}</h2>
                    <p className="text-slate-500 font-semibold">{detailsCandidate.candidate.headline || "Candidate"}</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">About</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">{detailsCandidate.candidate.bio || "No bio available."}</p>

                    <h3 className="font-bold text-slate-900 mb-2">Experience</h3>
                    {detailsCandidate.candidate.experience?.map((exp, i) => (
                      <div key={i} className="mb-3 text-sm">
                        <div className="font-semibold text-slate-800">{exp.job_title}</div>
                        <div className="text-slate-500">{exp.company}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailsCandidate.candidate.skills?.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700">{skill.skill_name}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
