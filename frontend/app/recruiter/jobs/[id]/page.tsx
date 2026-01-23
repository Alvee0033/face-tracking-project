"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { jobsAPI, applicationsAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { MapPin, Briefcase, Clock, Building2, DollarSign, Calendar, Edit, ChevronRight, Users, Loader2 } from "lucide-react"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"

interface Job {
  id: string
  job_title: string
  department: string
  job_type: string
  work_mode: string
  experience_level: string
  country: string
  city: string
  address?: string
  job_description: string
  responsibilities: string
  qualifications: string
  nice_to_have?: string
  benefits?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  salary_period?: string
  status: string
  created_at: string
  application_count?: number
  job_skills: Array<{ skill_name: string }>
}

interface Application {
  id: string
  job_id: string
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
  applied_at: string
  candidate_profiles: {
    id: string
    headline?: string
    current_job_title?: string
    current_company?: string
    years_of_experience?: string
    profiles: {
      full_name: string
      email: string
      profile_picture_url?: string
    }
  }
}

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingApplications, setLoadingApplications] = useState(true)
  const [error, setError] = useState("")
  const [applicationStats, setApplicationStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    shortlisted: 0,
    rejected: 0,
    hired: 0
  })
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' | 'all'>('all')

  useEffect(() => {
    loadJob()
    loadApplications()
  }, [params.id])

  const loadJob = async () => {
    try {
      const response = await jobsAPI.getById(params.id as string)
      const jobData = response.data.job || response.data
      setJob(jobData)
    } catch (err: any) {
      console.error("Error loading job:", err)
      setError(err.response?.data?.message || "Failed to load job")
    } finally {
      setLoading(false)
    }
  }

  const loadApplications = async (status?: string) => {
    setLoadingApplications(true)
    try {
      const response = await applicationsAPI.getJobApplications(params.id as string, { status })
      const applicationsData = response.data.applications || []
      setApplications(applicationsData)

      // Calculate stats
      const stats = {
        total: response.data.pagination?.total || 0,
        pending: 0,
        reviewed: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0
      }

      // If we have all applications, calculate stats from the data
      if (!status) {
        applicationsData.forEach((app: Application) => {
          stats[app.status]++
        })
      } else {
        // If filtered by status, we need to make another call to get total counts
        try {
          const allResponse = await applicationsAPI.getJobApplications(params.id as string)
          stats.total = allResponse.data.pagination?.total || 0

          allResponse.data.applications.forEach((app: Application) => {
            stats[app.status]++
          })
        } catch (err) {
          console.error("Error loading all applications for stats:", err)
        }
      }

      setApplicationStats(stats)
    } catch (err: any) {
      console.error("Error loading applications:", err)
    } finally {
      setLoadingApplications(false)
    }
  }

  const handleTabChange = (tab: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired' | 'all') => {
    setActiveTab(tab)
    if (tab === 'all') {
      loadApplications()
    } else {
      loadApplications(tab)
    }
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired') => {
    try {
      await applicationsAPI.updateApplicationStatus(applicationId, newStatus)

      // Update the application in the local state
      setApplications(applications.map(app =>
        app.id === applicationId ? { ...app, status: newStatus } : app
      ))

      // Update stats
      const oldStatus = applications.find(app => app.id === applicationId)?.status
      if (oldStatus && oldStatus !== newStatus) {
        setApplicationStats(prev => ({
          ...prev,
          [oldStatus]: Math.max(0, prev[oldStatus] - 1),
          [newStatus]: prev[newStatus] + 1
        }))
      }
    } catch (err) {
      console.error("Error updating application status:", err)
    }
  }

  const formatSalary = () => {
    if (!job?.salary_min && !job?.salary_max) return null
    const currency = job.salary_currency || 'JPY'
    const isAnnual = job.salary_period === 'per year' || !job.salary_period

    if (job.salary_min && job.salary_max) {
      if (isAnnual) {
        const min = Math.round(job.salary_min / 1000)
        const max = Math.round(job.salary_max / 1000)
        return `${currency}${min}-${max}K`
      } else {
        const period = job.salary_period === 'per month' ? '/mo' : job.salary_period === 'per hour' ? '/hr' : ''
        return `${currency}${job.salary_min.toLocaleString()}-${job.salary_max.toLocaleString()}${period}`
      }
    } else if (job.salary_min) {
      if (isAnnual) {
        const min = Math.round(job.salary_min / 1000)
        return `${currency}${min}K+`
      } else {
        const period = job.salary_period === 'per month' ? '/mo' : job.salary_period === 'per hour' ? '/hr' : ''
        return `${currency}${job.salary_min.toLocaleString()}${period}+`
      }
    } else {
      if (isAnnual) {
        const max = Math.round(job.salary_max! / 1000)
        return `Up to ${currency}${max}K`
      } else {
        const period = job.salary_period === 'per month' ? '/mo' : job.salary_period === 'per hour' ? '/hr' : ''
        return `Up to ${currency}${job.salary_max!.toLocaleString()}${period}`
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'draft':
        return 'bg-amber-100 text-amber-700'
      case 'closed':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDF4]">
        <RecruiterNavbar />
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <RecruiterSidebar />
            <div className="lg:col-span-10 flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-teal-800 font-medium animate-pulse">Loading job details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
        </div>

        <RecruiterNavbar />

        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <RecruiterSidebar />
            <div className="lg:col-span-10">
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-12 text-center shadow-lg shadow-teal-900/5">
                <p className="text-red-600 mb-6 text-lg font-medium">{error || "Job not found"}</p>
                <Button
                  onClick={() => router.push("/recruiter/jobs")}
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 rounded-xl px-8 py-6 text-lg"
                >
                  Back to Jobs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <RecruiterNavbar />

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Sidebar - Navigation */}
          <RecruiterSidebar />

          {/* Main Content */}
          <div className="lg:col-span-10">
            <div className="space-y-6">
              {/* Header with Back Button */}
              <div className="flex items-center gap-4 mb-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/recruiter/jobs")}
                  className="p-2 h-10 w-10 rounded-full bg-white hover:bg-teal-50 text-slate-500 hover:text-teal-600 shadow-sm border border-slate-200 transition-all hover:-translate-x-1"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </Button>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Job Details</h1>
                  <p className="text-slate-500 font-medium">Manage job listing and applications</p>
                </div>
              </div>

              {/* Job Header Card */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h2 className="text-2xl font-bold text-slate-900">{job.job_title}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                        ${job.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          job.status === 'draft' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.department && (
                      <p className="text-base text-slate-500 font-medium mb-6 bg-slate-50/50 inline-block px-3 py-1 rounded-lg border border-slate-100">
                        {job.department}
                      </p>
                    )}

                    {/* Job Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100/50">
                        <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                          <Clock className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{job.job_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100/50">
                        <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{job.work_mode}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100/50">
                        <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{job.experience_level}</span>
                      </div>
                      {formatSalary() && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100/50">
                          <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{formatSalary()}</span>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{job.city}, {job.country}</span>
                      {job.address && <span className="text-slate-300">• {job.address}</span>}
                    </div>

                    {/* Skills */}
                    {job.job_skills && job.job_skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.job_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-xs font-semibold"
                          >
                            {skill.skill_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/recruiter/jobs/${job.id}/edit`}>
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 rounded-xl transition-all hover:scale-105">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Job
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Job Description Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 h-full">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                    Job Description
                  </h3>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {job.job_description}
                  </div>
                </div>

                {/* Responsibilities */}
                {job.responsibilities && (
                  <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 h-full">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                      Responsibilities
                    </h3>
                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {job.responsibilities}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                {/* Qualifications */}
                {job.qualifications && (
                  <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 h-full">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                      Qualifications
                    </h3>
                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {job.qualifications}
                    </div>
                  </div>
                )}

                {/* Nice to Have & Benefits */}
                <div className="space-y-6">
                  {/* Nice to Have */}
                  {job.nice_to_have && (
                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                        Nice to Have
                      </h3>
                      <div className="prose prose-slate prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {job.nice_to_have}
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {job.benefits && (
                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                        Benefits
                      </h3>
                      <div className="prose prose-slate prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {job.benefits}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Applications Section */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    <div className="bg-teal-100 p-2 rounded-xl mr-3">
                      <Users className="h-5 w-5 text-teal-600" />
                    </div>
                    Applications
                    <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-sm font-bold border border-slate-200">
                      {applicationStats.total}
                    </span>
                  </h3>

                  {/* Filter Tabs */}
                  <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-xl">
                    {(['all', 'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeTab === tab
                          ? 'bg-white text-teal-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                          }`}
                      >
                        {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {/* {tab !== 'all' && ` (${applicationStats[tab]})`} */}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Applications List */}
                {loadingApplications ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-100 border-t-teal-600 mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading applications...</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="p-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-slate-400" />
                    </div>
                    <h4 className="text-slate-900 font-bold mb-1">No applications found</h4>
                    <p className="text-slate-500 mb-6">There are no candidates in this category yet.</p>
                    {activeTab !== 'all' && (
                      <Button
                        variant="outline"
                        onClick={() => handleTabChange('all')}
                        className="border-slate-200 hover:bg-white hover:border-teal-200 hover:text-teal-600"
                      >
                        View All Applications
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application, index) => (
                      <div
                        key={application.id}
                        className="p-5 bg-white/60 hover:bg-white border border-white/60 hover:border-teal-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                              {application.candidate_profiles.profiles.profile_picture_url ? (
                                <img
                                  src={application.candidate_profiles.profiles.profile_picture_url}
                                  alt={application.candidate_profiles.profiles.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xl font-bold text-teal-600">
                                  {application.candidate_profiles.profiles.full_name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-900 text-lg group-hover:text-teal-700 transition-colors">
                                {application.candidate_profiles.profiles.full_name}
                              </h4>
                              <p className="text-sm text-slate-600 font-medium">
                                {application.candidate_profiles.headline ||
                                  application.candidate_profiles.current_job_title ||
                                  application.candidate_profiles.profiles.email}
                              </p>
                              {application.candidate_profiles.current_company && (
                                <p className="text-xs text-slate-400 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                                  {application.candidate_profiles.current_company}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <select
                                value={application.status}
                                onChange={(e) => updateApplicationStatus(
                                  application.id,
                                  e.target.value as 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
                                )}
                                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer hover:bg-white"
                              >
                                <option value="pending">Pending</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="rejected">Rejected</option>
                                <option value="hired">Hired</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                              </div>
                            </div>

                            <Link href={`/recruiter/applications/${application.id}`}>
                              <Button variant="ghost" className="h-10 w-10 p-0 rounded-full border border-slate-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-all">
                                <ChevronRight className="h-5 w-5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
