"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { applicationsAPI, jobsAPI, aiAnalysisAPI } from "@/lib/api"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { Download, Mail, Phone, Globe, ArrowRight, X, Sparkles, TrendingUp, AlertCircle, Filter, Zap, Check } from "lucide-react"
import { sendInterviewInvitationEmail } from "@/lib/emailService"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Helper component for loading spinner
const Spinner = ({ className }: { className?: string }) => (
  <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
)

interface Application {
  id: string
  status: string
  applied_at: string
  candidate_profiles: {
    id: string
    headline?: string
    current_job_title?: string
    current_company?: string
    portfolio_website?: string
    years_of_experience?: number
    profiles: {
      full_name: string
      email: string
      phone_number?: string
      profile_picture_url?: string
    }
  }
  ai_analysis?: {
    overall_score: number
    score_breakdown: {
      skills_match: number
      experience_match: number
      education_match: number
      overall_fit: number
    }
    strengths: string[]
    skill_gaps: string[]
    experience_gaps: string[]
    recommendations: string[]
    fit_level: string
    summary: string
  }
  analyzing?: boolean
}

interface Job {
  id: string
  job_title: string
  recruiter_profiles?: {
    company_name?: string
    profiles?: {
      full_name?: string
    }
  }
}

export default function ApplicationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')

  const [applications, setApplications] = useState<Application[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<string>(jobId || "")
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [selectBestCount, setSelectBestCount] = useState<string>("5")
  const [selectedBestIds, setSelectedBestIds] = useState<Set<string>>(new Set())
  const [selectBestLoading, setSelectBestLoading] = useState(false)

  useEffect(() => {
    fetchJobs()
    if (jobId) {
      fetchApplications(jobId)
    }
  }, [])

  useEffect(() => {
    if (selectedJob) {
      fetchApplications(selectedJob)
    }
  }, [selectedJob])

  // Split effect for auto-selection to avoid loops
  useEffect(() => {
    if (applications.length > 0 && !selectedApplication) {
      setSelectedApplication(applications[0].id)
    }
  }, [applications])

  const fetchJobs = async () => {
    try {
      // Changed limit to 100 to get all recruiter jobs
      const response = await jobsAPI.getRecruiterJobs({ limit: 100 })
      setJobs(response.data.jobs || [])
      if (!selectedJob && response.data.jobs && response.data.jobs.length > 0) {
        setSelectedJob(response.data.jobs[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
    }
  }

  const fetchApplications = async (jobId: string) => {
    try {
      setLoading(true)

      // Try to load from cache first for instant display
      const cacheKey = `applications_${jobId}`

      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          setApplications(cachedData)
          if (cachedData.length > 0 && !selectedApplication) {
            setSelectedApplication(cachedData[0].id)
          }
          setLoading(false)
        } catch (err) {
          console.error('Failed to parse cache:', err)
        }
      }

      const response = await applicationsAPI.getJobApplications(jobId)

      console.log('DEBUG: Frontend API response:', {
        jobId,
        params: { limit: 100 },
        responseStatus: response.status,
        dataAppCount: response.data.applications?.length,
        firstAppPreview: response.data.applications?.[0] ? JSON.stringify(response.data.applications[0], null, 2) : 'None'
      });

      const rawApps = response.data.applications || []

      // Transform backend data to match frontend interface
      const transformedApps = rawApps.map((app: any) => ({
        ...app,
        // Transform ai_analysis_data to ai_analysis to match interface
        ai_analysis: app.ai_analysis_data ? {
          overall_score: app.ai_analysis_data.overall_score || app.ai_analysis_score,
          score_breakdown: app.ai_analysis_data.score_breakdown,
          strengths: app.ai_analysis_data.strengths,
          skill_gaps: app.ai_analysis_data.skill_gaps,
          experience_gaps: app.ai_analysis_data.experience_gaps,
          recommendations: app.ai_analysis_data.recommendations,
          fit_level: app.ai_analysis_data.fit_level,
          summary: app.ai_analysis_data.summary
        } : undefined
      }))

      // Filter out shortlisted - they belong in interview page
      const filtered = transformedApps.filter(
        (app: Application) => app.status !== 'shortlisted'
      )

      console.log('DEBUG: Application filtering:', {
        total: transformedApps.length,
        filtered: filtered.length,
        removed: transformedApps.length - filtered.length,
        firstFilteredApp: filtered[0]
      });

      // Save to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(filtered))
      } catch (err) {
        console.error('Failed to cache applications:', err)
      }

      setApplications(filtered)
      if (filtered.length > 0) {
        setSelectedApplication(filtered[0].id)
      } else {
        setSelectedApplication(null)
      }

      // Auto-analyze candidates that don't have AI analysis
      const unanalyzedApps = filtered.filter((app: Application) => !app.ai_analysis?.overall_score)

      if (unanalyzedApps.length > 0) {
        // Analyze all unanalyzed candidates in the background
        const analysisPromises = unanalyzedApps.map((app: Application) =>
          analyzeApplication(app.id).catch(err => {
            console.error(`Failed to analyze ${app.candidate_profiles?.profiles?.full_name}:`, err)
            return null
          })
        )

        // Don't wait for all to complete, let them run in background
        Promise.allSettled(analysisPromises).then(() => {
          console.log(`✅ Auto-analysis complete for all candidates`)
        })
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeApplication = async (applicationId: string) => {
    try {
      // Set analyzing state using functional update to avoid stale state
      setApplications(prev => prev.map(app =>
        app.id === applicationId ? { ...app, analyzing: true } : app
      ))

      const response = await aiAnalysisAPI.analyzeApplicantCompatibility(applicationId)

      // Update application with analysis results using functional update
      setApplications(prev => {
        const updated = prev.map(app =>
          app.id === applicationId
            ? { ...app, ai_analysis: response.data.analysis, analyzing: false }
            : app
        )

        // Update cache within the functional update to ensure we have latest state
        if (selectedJob) {
          try {
            const cacheKey = `applications_${selectedJob}`
            localStorage.setItem(cacheKey, JSON.stringify(updated))
          } catch (err) {
            console.error('Failed to update cache:', err)
          }
        }

        return updated
      })

    } catch (error) {
      console.error("Failed to analyze application:", error)
      setApplications(prev => prev.map(app =>
        app.id === applicationId ? { ...app, analyzing: false } : app
      ))
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-teal-600'
    if (score >= 70) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-rose-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-teal-50 border-teal-200'
    if (score >= 70) return 'bg-emerald-50 border-emerald-200'
    if (score >= 60) return 'bg-amber-50 border-amber-200'
    return 'bg-rose-50 border-rose-200'
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      // Find the application to get candidate details
      const application = applications.find(app => app.id === applicationId);

      await applicationsAPI.updateApplicationStatus(applicationId, newStatus)

      // Send email notification when moving to interview
      if (newStatus === 'shortlisted' && application) {
        const currentJob = jobs.find(j => j.id === selectedJob);

        try {
          await sendInterviewInvitationEmail({
            candidateName: application.candidate_profiles.profiles.full_name,
            candidateEmail: application.candidate_profiles.profiles.email,
            jobTitle: currentJob?.job_title || 'Position',
            companyName: currentJob?.recruiter_profiles?.company_name || 'Our Company',
            recruiterName: currentJob?.recruiter_profiles?.profiles?.full_name,
          });
        } catch (emailError) {
          console.error('❌ Error sending email:', emailError);
        }
      }

      if (newStatus === 'shortlisted') {
        setApplications(apps => apps.filter(app => app.id !== applicationId))
        if (selectedJob) {
          router.push(`/recruiter/interview?jobId=${selectedJob}`)
        }
      } else {
        setApplications(apps =>
          apps.map(app =>
            app.id === applicationId ? { ...app, status: newStatus } : app
          )
        )
      }
    } catch (error) {
      console.error("Failed to update:", error)
      alert("Failed to update status")
    }
  }

  const handleSelectBest = async () => {
    const count = parseInt(selectBestCount) || 0

    if (count <= 0) {
      alert("Please enter a valid number greater than 0")
      return
    }

    // Check if we have enough candidates
    const eligibleCandidates = applications.filter(app => app.status !== 'shortlisted' && app.status !== 'rejected')

    if (eligibleCandidates.length === 0) {
      alert("No eligible candidates to select.")
      return
    }

    if (count > eligibleCandidates.length) {
      const proceed = window.confirm(
        `You requested ${count} candidates but only ${eligibleCandidates.length} are available. ` +
        `Would you like to select all ${eligibleCandidates.length} candidates?`
      )
      if (!proceed) return
    }

    setSelectBestLoading(true)
    try {
      // Get unanalyzed applications from eligible candidates
      const unanalyzedApps = eligibleCandidates.filter(app => !app.ai_analysis?.overall_score)

      // Auto-analyze ALL unanalyzed candidates first
      if (unanalyzedApps.length > 0) {
        try {
          // Analyze all unanalyzed candidates sequentially to avoid overwhelming the server
          for (let i = 0; i < unanalyzedApps.length; i++) {
            const app = unanalyzedApps[i]
            await analyzeApplication(app.id)
          }

          await new Promise(resolve => setTimeout(resolve, 1500))
        } catch (error) {
          console.error("Error analyzing candidates:", error)
        }
      }

      const response = await applicationsAPI.getJobApplications(selectedJob)
      const allApps = response.data.applications || []

      const updatedEligibleApps = allApps.filter(
        (app: Application) => app.status !== 'shortlisted' && app.status !== 'rejected'
      )

      setApplications(allApps)

      const analyzedApps = updatedEligibleApps.filter((app: Application) => app.ai_analysis?.overall_score)

      if (analyzedApps.length === 0) {
        alert("No candidates have been analyzed yet. Please try again.")
        return
      }

      // Sort by AI score (descending) and take top N
      const sortedByScore = [...analyzedApps].sort((a, b) =>
        (b.ai_analysis?.overall_score || 0) - (a.ai_analysis?.overall_score || 0)
      )

      const actualCount = Math.min(count, sortedByScore.length)
      const topCandidates = sortedByScore.slice(0, actualCount)
      const topIds = new Set(topCandidates.map(app => app.id))

      setSelectedBestIds(topIds)

      // Automatically shortlist the top N candidates and send to interview manager
      for (let i = 0; i < topCandidates.length; i++) {
        await updateApplicationStatus(topCandidates[i].id, 'shortlisted')
      }

      if (topCandidates.length > 0) {
        setSelectedApplication(topCandidates[0].id)
      }

      alert(`Successfully selected and moved ${topCandidates.length} top candidates to the interview stage!`)

      setTimeout(() => {
        router.push(`/recruiter/interview?jobId=${selectedJob}`)
      }, 500)
    } catch (error) {
      console.error("Error in handleSelectBest:", error)
      alert("Failed to select best candidates. Please try again.")
    } finally {
      setSelectBestLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedBestIds(new Set())
  }

  const filteredApplications = applications.filter(app => {
    if (!app) {
      console.log('DEBUG: Filter - App is undef/null');
      return false;
    }

    // Debug logic for valid apps
    if (!app.candidate_profiles) {
      console.log('DEBUG: Filter - Missing candidate_profiles', app.id);
      return false;
    }
    if (!app.candidate_profiles.profiles) {
      console.log('DEBUG: Filter - Missing profiles', app.id);
      return false;
    }

    const matchesSearch = app.candidate_profiles.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "All" || app.status.toLowerCase() === statusFilter.toLowerCase()

    if (!matchesSearch || !matchesStatus) {
      console.log(`DEBUG: Filter - Mismatch. Search: ${matchesSearch}, Status: ${matchesStatus} (App Status: ${app.status}, Filter: ${statusFilter})`);
    }

    return matchesSearch && matchesStatus
  })

  // Add effect to log when applications state changes
  useEffect(() => {
    console.log('DEBUG: Applications state updated:', applications.length, applications);
  }, [applications]);

  const selectedApp = applications.find(app => app.id === selectedApplication)

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-inter overflow-hidden selection:bg-teal-200 selection:text-teal-900">
      <RecruiterNavbar />

      <div className="flex-1 flex max-w-[1920px] mx-auto w-full p-6 gap-6 overflow-hidden">
        <RecruiterSidebar />

        {/* Main Content Split View */}
        <main className="flex-1 flex overflow-hidden gap-6">

          {/* LEFT PANEL: APPLICANT LIST */}
          <div className="w-[380px] flex-shrink-0 bg-white rounded-[2rem] flex flex-col z-20 shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-white z-10">
              <div className="mb-4">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Applicants</h1>
                <p className="text-xs text-slate-500 font-semibold mt-1 truncate">
                  {jobs.find(j => j.id === selectedJob)?.job_title || "Select a Job"}
                </p>
              </div>

              <div className="space-y-3">
                <Select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full h-10 text-sm bg-slate-50 border-slate-200 ring-0 focus:ring-2 focus:ring-teal-500 font-semibold rounded-xl text-slate-700"
                >
                  <option value="" disabled>Select Position</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.job_title}</option>
                  ))}
                </Select>

                <div className="relative group">
                  <Filter className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400 font-semibold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50">
              {loading && !applications.length ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse flex gap-3 border border-slate-100">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-2/3 bg-slate-200 rounded-full" />
                      <div className="h-3 w-1/3 bg-slate-100 rounded-full" />
                    </div>
                  </div>
                ))
              ) : filteredApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <div className="bg-white p-3 rounded-full mb-2 shadow-sm border border-slate-200">
                    <Filter className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="font-semibold text-xs text-slate-500">No applicants found</p>
                </div>
              ) : (
                filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApplication(app.id)}
                    className={cn(
                      "group relative p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border",
                      selectedApplication === app.id
                        ? "bg-white border-teal-200 shadow-lg shadow-teal-900/5 z-10 ring-1 ring-teal-100"
                        : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center text-sm font-bold shadow-sm transition-transform duration-300 border border-slate-100",
                          selectedApplication === app.id ? "ring-2 ring-teal-500 ring-offset-2" : "group-hover:border-slate-300"
                        )}>
                          {app.candidate_profiles.profiles.profile_picture_url ? (
                            <img src={app.candidate_profiles.profiles.profile_picture_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-teal-50 text-teal-700 flex items-center justify-center">
                              {app.candidate_profiles.profiles.full_name[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className={cn(
                            "font-bold text-sm truncate transition-colors",
                            selectedApplication === app.id ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                          )}>
                            {app.candidate_profiles.profiles.full_name}
                          </h3>
                          {app.ai_analysis?.overall_score && (
                            <span className={cn(
                              "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                              app.ai_analysis.overall_score >= 80
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                              {app.ai_analysis.overall_score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-semibold truncate">
                          {app.candidate_profiles.current_job_title || "Applicant"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANEL: DETAILS */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {selectedApp ? (
              <div className="flex-1 bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden relative flex flex-col animate-fade-in">

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">

                  {/* HERO HEADER */}
                  <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20 shadow-sm">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-md">
                          {selectedApp.candidate_profiles.profiles.profile_picture_url ? (
                            <img src={selectedApp.candidate_profiles.profiles.profile_picture_url} className="h-full w-full object-cover" alt="" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-teal-600 text-white text-3xl font-bold">
                              {selectedApp.candidate_profiles.profiles.full_name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{selectedApp.candidate_profiles.profiles.full_name}</h1>
                          <p className="text-sm font-semibold text-slate-500 mb-3">{selectedApp.candidate_profiles.current_job_title || "Candidate"}</p>

                          <div className="flex items-center gap-2">
                            {selectedApp.candidate_profiles.profiles.email && (
                              <a href={`mailto:${selectedApp.candidate_profiles.profiles.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                                <Mail className="h-3.5 w-3.5" /> Email
                              </a>
                            )}
                            {selectedApp.candidate_profiles.profiles.phone_number && (
                              <a href={`tel:${selectedApp.candidate_profiles.profiles.phone_number}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                                <Phone className="h-3.5 w-3.5" /> Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => updateApplicationStatus(selectedApp.id, 'rejected')}
                          className="h-11 px-6 rounded-xl border-2 border-rose-100 text-rose-600 bg-white hover:bg-rose-50 hover:border-rose-200 font-bold shadow-sm transition-all"
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => updateApplicationStatus(selectedApp.id, 'shortlisted')}
                          className="h-11 px-8 rounded-xl bg-slate-900 text-white hover:bg-teal-600 shadow-lg hover:shadow-teal-500/25 font-bold transition-all"
                        >
                          Shortlist Candidate
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* DETAILS CONTENT */}
                  <div className="p-8 space-y-6 max-w-6xl mx-auto">

                    {/* TOP GRID: SCORE & STATS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* AI SCORE BLOCK */}
                      <div className="lg:col-span-2 bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-teal-100 p-2 rounded-lg">
                              <Sparkles className="h-5 w-5 text-teal-700" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">AI Compatibility Analysis</h3>
                          </div>
                          {selectedApp.analyzing && <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full animate-pulse">Analyzing...</span>}
                        </div>

                        {selectedApp.ai_analysis && !selectedApp.analyzing ? (
                          <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative">
                              <svg className="h-32 w-32 -rotate-90 transform">
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={351.86} strokeDashoffset={351.86 - (351.86 * selectedApp.ai_analysis.overall_score) / 100} className="text-teal-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-slate-900">{selectedApp.ai_analysis.overall_score}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match</span>
                              </div>
                            </div>

                            <div className="flex-1 w-full space-y-4">
                              <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                  <span>Skills Match</span>
                                  <span className="text-slate-800">{selectedApp.ai_analysis.score_breakdown.skills_match}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full" style={{ width: getScoreWidth(selectedApp.ai_analysis.score_breakdown.skills_match) }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                  <span>Experience Match</span>
                                  <span className="text-slate-800">{selectedApp.ai_analysis.score_breakdown.experience_match}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: getScoreWidth(selectedApp.ai_analysis.score_breakdown.experience_match) }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                  <span>Education Match</span>
                                  <span className="text-slate-800">{selectedApp.ai_analysis.score_breakdown.education_match}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 rounded-full" style={{ width: getScoreWidth(selectedApp.ai_analysis.score_breakdown.education_match) }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 flex justify-center">
                            {!selectedApp.analyzing && (
                              <Button onClick={() => analyzeApplication(selectedApp.id)} className="bg-slate-900 text-white font-bold px-8 py-6 rounded-xl hover:bg-teal-600 transition-colors">
                                Generate AI Insights
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* QUICK STATS */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-center h-[calc(50%-0.5rem)]">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-900">{selectedApp.candidate_profiles.years_of_experience || 0}</span>
                            <span className="text-sm font-bold text-slate-500">Years</span>
                          </div>
                        </div>
                        <div onClick={() => { }} className="bg-slate-900 rounded-[1.5rem] p-6 shadow-md cursor-pointer hover:bg-teal-600 transition-all group flex flex-col justify-center h-[calc(50%-0.5rem)] text-left">
                          <Download className="h-6 w-6 text-slate-400 group-hover:text-white mb-2 transition-colors" />
                          <span className="text-lg font-bold text-white leading-tight">Download<br />Resume</span>
                        </div>
                      </div>
                    </div>

                    {/* DETAILS ROW */}
                    {selectedApp.ai_analysis && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                          <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-200 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-emerald-700" />
                            </div>
                            Key Strengths
                          </h4>
                          <ul className="space-y-3">
                            {selectedApp.ai_analysis.strengths.map((s, i) => (
                              <li key={i} className="flex gap-3 text-sm font-medium text-emerald-800 leading-relaxed">
                                <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                          <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-amber-200 flex items-center justify-center">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                            </div>
                            Potential Concerns
                          </h4>
                          <ul className="space-y-3">
                            {selectedApp.ai_analysis.skill_gaps.map((s, i) => (
                              <li key={i} className="flex gap-3 text-sm font-medium text-amber-900 leading-relaxed">
                                <span className="block h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="md:col-span-2 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                          <h4 className="font-bold text-slate-700 mb-2">AI Summary</h4>
                          <p className="text-slate-600 leading-relaxed italic border-l-4 border-teal-500 pl-4 py-1">
                            "{selectedApp.ai_analysis.summary}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 border-dashed shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <Filter className="h-10 w-10 text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">No Candidate Selected</h2>
                <p className="text-slate-500 font-medium mt-1">Select a candidate to view details</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}

// Helper to calculate width string
const getScoreWidth = (scoreStr: any) => {
  if (!scoreStr) return '0%';
  if (typeof scoreStr === 'string') {
    if (scoreStr.includes('High') || scoreStr.includes('Excellent')) return '95%';
    if (scoreStr.includes('Good') || scoreStr.includes('Medium')) return '70%';
    if (scoreStr.includes('Low') || scoreStr.includes('Poor')) return '30%';
  }
  const num = parseInt(scoreStr);
  return !isNaN(num) ? `${num}%` : '50%';
}
