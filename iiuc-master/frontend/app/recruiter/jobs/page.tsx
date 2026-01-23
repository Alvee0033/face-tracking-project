"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { jobsAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
// Import Lucide icons - adding Search and MoreHorizontal
import { Plus, Edit, Users, Search, MoreHorizontal } from "lucide-react"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"
// Ensure RecruiterTestCard is imported if it exists, logic unchanged
import { RecruiterTestCard } from "@/components/recruiter/test-card"

export default function RecruiterJobsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0, closed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'closed'>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Filter jobs client-side based on search query
  const filteredJobs = jobs.filter((job) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return job.job_title?.toLowerCase().includes(query) ||
        job.city?.toLowerCase().includes(query) ||
        job.country?.toLowerCase().includes(query)
    }
    return true
  })

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
    fetchJobs()
  }, [activeTab])


  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError(t('recruiter.notLoggedIn'))
        router.push('/auth/login')
        return
      }

      // Map frontend tabs to backend status values
      let status: string | undefined = undefined
      if (activeTab === 'active') {
        status = 'active'
      } else if (activeTab === 'paused') {
        status = 'draft' // Map 'paused' to 'draft' for backend
      } else if (activeTab === 'closed') {
        status = 'closed'
      }
      // activeTab === 'all' means status stays undefined

      const response = await jobsAPI.getRecruiterJobs({ status })
      setJobs(response.data.jobs || [])
      setStats(response.data.stats || { total: 0, active: 0, draft: 0, closed: 0 })
    } catch (error: any) {
      console.error("Failed to fetch jobs:", error)
      // Check if it's a 403 Forbidden error
      if (error.response?.status === 403) {
        const errorMsg = error.response?.data?.message || t('recruiter.accessDenied')
        setError(errorMsg)
        console.error("Authorization error:", errorMsg)
      } else if (error.response?.status === 401) {
        setError(t('recruiter.sessionExpired'))
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        router.push('/auth/login')
      } else {
        setError(t('recruiter.failedToLoadJobs'))
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
      case 'draft':
      case 'paused':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
      case 'closed':
        return 'bg-muted text-muted-foreground border-border'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t('recruiter.draft')
      case 'active':
        return t('recruiter.active')
      case 'closed':
        return t('recruiter.closed')
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <RecruiterNavbar />

      <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Navigation */}
          <RecruiterSidebar />

          {/* Main Content */}
          <div className="lg:col-span-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {t('recruiter.myJobListings')}
                </h1>
                <p className="text-slate-500 mt-2 text-lg font-medium">Manage and track all your job openings</p>
              </div>
              <Button
                onClick={() => router.push("/recruiter/jobs/new")}
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 transition-all duration-300 hover:-translate-y-0.5"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                {t('recruiter.postNewJob')}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500 animate-slide-up">
                {error}
              </div>
            )}

            {/* Search and Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-2 rounded-2xl shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center p-1">
                <div className="w-full sm:flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder={t('recruiter.searchByJobTitle')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-transparent rounded-xl leading-5 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-200 sm:text-sm transition-all duration-200"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full sm:w-auto p-1.5 bg-slate-100/50 rounded-xl">
                  {['all', 'active', 'paused', 'closed'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={cn(
                        "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize whitespace-nowrap relative z-10",
                        activeTab === tab
                          ? "text-teal-700 bg-white shadow-sm ring-1 ring-black/5"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                      )}
                    >
                      {tab === 'all' ? t('recruiter.all') :
                        tab === 'paused' ? t('recruiter.draft') :
                          tab === 'active' ? t('recruiter.active') :
                            t('recruiter.closed')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Jobs - Desktop Table */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden hidden md:block shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-teal-100/50">
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-10">
                        <div className="w-4 h-4 border-2 border-slate-300 rounded flex items-center justify-center"></div>
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t('recruiter.jobTitle')}
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t('recruiter.status')}
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t('recruiter.datePosted')}
                      </th>
                      <th className="px-6 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t('recruiter.applicants')}
                      </th>
                      <th className="px-6 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t('recruiter.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-10 w-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 font-medium animate-pulse">{t('recruiter.loadingJobs')}</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="h-16 w-16 rounded-3xl bg-teal-50 flex items-center justify-center mb-2 shadow-sm transform -rotate-3">
                              <Search className="h-8 w-8 text-teal-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {searchQuery.trim() ? t('recruiter.noJobsMatchSearch') : t('recruiter.noJobsFound')}
                            </h3>
                            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                              {searchQuery.trim()
                                ? "Try adjusting your search terms or filters to find what you're looking for."
                                : "Get started by creating your first job posting to attract top talent."}
                            </p>
                            {!searchQuery.trim() && (
                              <Button
                                onClick={() => router.push("/recruiter/jobs/new")}
                                variant="outline"
                                className="mt-4 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 font-semibold"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('recruiter.postNewJob')}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job, index) => (
                        <tr
                          key={job.id}
                          className="group hover:bg-teal-50/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/recruiter/jobs/${job.id}`)}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{job.job_title}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                              <span className="truncate max-w-[150px]">{job.city}, {job.country}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn("px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border", getStatusColor(job.status))}>
                              {getStatusLabel(job.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-600">{formatDate(job.created_at)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 group-hover:bg-white group-hover:border-teal-200 group-hover:text-teal-700 group-hover:shadow-sm transition-all">
                              <Users className="h-3.5 w-3.5" />
                              {job.application_count || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/recruiter/jobs/${job.id}/edit`)
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all duration-200 hover:scale-110"
                                title={t('recruiter.editJob')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/recruiter/applications?jobId=${job.id}`)
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all duration-200 hover:scale-110"
                                title={t('recruiter.seeApplications')}
                              >
                                <Users className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination (Simplified for now) */}
              <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs font-medium text-slate-500">
                  Showing <span className="font-bold text-slate-900">{filteredJobs.length}</span> jobs
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 opacity-50"><MoreHorizontal className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            {/* Jobs - Mobile Cards */}
            <div className="md:hidden space-y-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {loading ? (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 text-center shadow-lg shadow-teal-900/5">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">{t('recruiter.loadingJobs')}</p>
                  </div>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 text-center shadow-lg shadow-teal-900/5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-3xl bg-teal-50 flex items-center justify-center mb-2 shadow-sm transform -rotate-3">
                      <Search className="h-8 w-8 text-teal-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {searchQuery.trim() ? t('recruiter.noJobsMatchSearch') : t('recruiter.noJobsFound')}
                    </h3>
                    <p className="text-slate-500 leading-relaxed">
                      {searchQuery.trim()
                        ? "Try adjusting your search terms or filters."
                        : "Get started by creating your first job posting."}
                    </p>
                  </div>
                </div>
              ) : (
                filteredJobs.map((job, index) => (
                  <div
                    key={job.id}
                    className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-5 active:scale-[0.99] transition-all duration-300 shadow-lg shadow-teal-900/5 cursor-pointer hover:shadow-xl hover:shadow-teal-900/10"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => router.push(`/recruiter/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{job.job_title}</h3>
                        <p className="text-sm text-slate-500 font-medium">{job.city}, {job.country}</p>
                      </div>
                      <span className={cn("px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full border shadow-sm", getStatusColor(job.status))}>
                        {getStatusLabel(job.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5 font-semibold">{t('recruiter.datePosted')}</p>
                        <p className="font-bold text-slate-900">{formatDate(job.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5 font-semibold">{t('recruiter.applicants')}</p>
                        <p className="font-bold text-slate-900">{job.application_count || 0}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/recruiter/applications?jobId=${job.id}`)
                        }}
                        className="flex-1 h-10 text-sm bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30 transition-all font-semibold"
                      >
                        <Users className="h-4 w-4 mr-2" /> {t('recruiter.seeApplications')}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/recruiter/jobs/${job.id}/edit`)
                        }}
                        variant="outline"
                        className="flex-1 h-10 text-sm border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold"
                      >
                        <Edit className="h-4 w-4 mr-2" /> {t('recruiter.editJob')}
                      </Button>
                    </div>
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