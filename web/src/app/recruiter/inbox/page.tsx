"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RecruiterNavbar } from '@/components/recruiter-navbar'
import { RecruiterSidebar } from '@/components/recruiter-sidebar'
import { ChatBox } from '@/components/chat-box'
import {
  Inbox as InboxIcon,
  MessageSquare,
  Briefcase,
  User,
  Search,
  MoreVertical,
  ArrowLeft
} from 'lucide-react'
import { messagingAPI, interviewAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Helper component for loading spinner
const Spinner = ({ className }: { className?: string }) => (
  <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
)

// We use similar types to InterviewPage but focused on messaging
interface Candidate {
  id: string
  status: string
  applied_at: string
  candidate: {
    id: string
    user_id: string
    profile: {
      full_name: string
      profile_picture_url: string
    }
  }
  conversation?: {
    id: string
    is_initiated: boolean
    last_message_at: string
    last_message_content: string | null
    recruiter_unread_count: number
  }[]
}

interface Job {
  id: string
  job_title: string
  selected_candidates: Candidate[]
}

export default function RecruiterInboxPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  // Helper state to store conversation ID once resolved (either from existing or newly created)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const [messageMode, setMessageMode] = useState<'casual' | 'professional'>('casual')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchCandidates()
  }, [])

  // When a candidate is selected, ensure we have a conversation ID
  useEffect(() => {
    if (selectedCandidate) {
      const existingConv = selectedCandidate.conversation?.[0]
      if (existingConv) {
        setActiveConversationId(existingConv.id)
      } else {
        // No conversation exists in the loaded data.
        setActiveConversationId(null)
        // We could auto-create one here, or show a 'Start Chat' button. 
        // User wants "click on them to send messege", so auto-creating or checking is smoother.
        getOrCreateConversation(selectedCandidate.id)
      }
    } else {
      setActiveConversationId(null)
    }
  }, [selectedCandidate])

  const getOrCreateConversation = async (applicationId: string) => {
    try {
      // API call to get or create conversation
      // Wait, we have interviewAPI.getOrCreateConversation!

      // Let's implement fetchCandidates properly.
      const res = await interviewAPI.getOrCreateConversation(applicationId)
      if (res.data.conversation) {
        setActiveConversationId(res.data.conversation.id)
        // Optionally, update the selectedCandidate's conversation array in state
        // This would require finding and updating the candidate within the jobs state
        // For now, we just set activeConversationId.
      }
    } catch (e) {
      console.error("Error setting up conversation", e)
    }
  }

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      // Use the interview endpoint to match Interview Page exactly
      const response = await interviewAPI.getRecruiterInterviews()

      const fetchedJobs = response.data.jobs || []
      setJobs(fetchedJobs)

      // Default selection logic
      if (fetchedJobs.length > 0) {
        // Try to keep previous selection if possible? 
        // For now just default to first job if nothing selected, or keep empty
        if (!selectedJob) {
          // Optional: Auto-select first job
          setSelectedJob(fetchedJobs[0])
        } else {
          // Update selected job with fresh data
          const updatedJob = fetchedJobs.find((j: Job) => j.id === selectedJob.id)
          if (updatedJob) setSelectedJob(updatedJob)
        }
      }
    } catch (error) {
      console.error('Failed to fetch inbox candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCandidateSelect = async (candidate: Candidate) => {
    setSelectedCandidate(candidate)

    // Immediately try to resolve conversation
    if (candidate.conversation && candidate.conversation.length > 0) {
      setActiveConversationId(candidate.conversation[0].id)
    } else {
      // Create on the fly
      try {
        const res = await interviewAPI.getOrCreateConversation(candidate.id) // candidate.id is applicationId here
        if (res.data.conversation) {
          setActiveConversationId(res.data.conversation.id)
          // Update local state to include this conversation so we don't fetch again?
          // Mutating state directly is bad, but for quick UI update:
          candidate.conversation = [res.data.conversation]
        }
      } catch (err) {
        console.error("Failed to init conversation:", err)
      }
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return 'New'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Messages</h1>
                <div className="relative mt-2">
                  <select
                    value={selectedJob?.id || ""}
                    onChange={(e) => {
                      const job = jobs.find(j => j.id === e.target.value)
                      if (job) {
                        setSelectedJob(job)
                        setSelectedCandidate(null)
                      }
                    }}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 appearance-none cursor-pointer focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                  >
                    {jobs.length === 0 && <option value="">No Active Jobs</option>}
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.job_title} ({job.selected_candidates?.length || 0})
                      </option>
                    ))}
                  </select>
                  <MoreVertical className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none rotate-90" />
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-200 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40">
                  <Spinner className="h-8 w-8 text-teal-600 mb-2" />
                  <span className="text-xs font-bold text-slate-400">Loading Candidates...</span>
                </div>
              ) : !selectedJob || selectedJob.selected_candidates?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <div className="bg-white p-4 rounded-full mb-3 shadow-sm border border-slate-200">
                    <MessageSquare className="h-6 w-6 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Candidates</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Wait for applications to be shortlisted (or moved to interview) to message candidates.
                  </p>
                </div>
              ) : (
                selectedJob.selected_candidates
                  .filter(c => c.candidate.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((candidate) => {
                    const conversation = candidate.conversation?.[0]
                    return (
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
                            {conversation && conversation.recruiter_unread_count > 0 && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                                {conversation.recruiter_unread_count}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <h3 className={cn(
                                "font-bold text-sm truncate transition-colors",
                                selectedCandidate?.id === candidate.id ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900",
                                (conversation?.recruiter_unread_count ?? 0) > 0 && "text-slate-900"
                              )}>
                                {candidate.candidate.profile.full_name}
                              </h3>
                              <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2">
                                {conversation ? formatTime(conversation.last_message_at) : 'New'}
                              </span>
                            </div>
                            <p className={cn(
                              "text-xs truncate",
                              (conversation?.recruiter_unread_count ?? 0) > 0 ? "text-slate-900 font-semibold" : "text-slate-500 font-medium"
                            )}>
                              {conversation?.last_message_content || 'Start a conversation'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: CHAT AREA */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {selectedCandidate ? (
              <div className="flex-1 bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden relative flex flex-col">

                {/* COMPACT HERO HEADER */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white sticky top-0 z-20">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                      {selectedCandidate.candidate.profile.profile_picture_url ? (
                        <img src={selectedCandidate.candidate.profile.profile_picture_url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-teal-600 text-white text-xl font-bold">
                          {selectedCandidate.candidate.profile.full_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{selectedCandidate.candidate.profile.full_name}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedJob && (
                          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-100 h-5 font-bold">
                            {selectedJob.job_title}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 font-medium capitalize">• {selectedCandidate.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHAT BOX */}
                <div className="flex-1 overflow-hidden bg-slate-50/50 relative">
                  <div className="absolute inset-0">
                    {activeConversationId ? (
                      <ChatBox
                        conversationId={activeConversationId}
                        isRecruiter={true}
                        messageMode={messageMode}
                        onModeChange={setMessageMode}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Spinner className="h-8 w-8 text-teal-600" />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 border-dashed shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 rotate-3">
                  <MessageSquare className="h-10 w-10 text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">No Candidate Selected</h2>
                <p className="text-slate-500 font-medium mt-1">Select a candidate on the left to start chatting</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
