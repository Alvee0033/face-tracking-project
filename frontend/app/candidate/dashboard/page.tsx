"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link" // Added Link
import { Search, Briefcase, Bell, User, ArrowRight, FileText, Clock, Award, Bookmark, List, FolderOpen, RefreshCw, Zap, TrendingUp, Grid, Activity, MapPin, Building2, Calendar, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { savedJobsAPI, applicationsAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useOptimizedData } from '@/lib/hooks/use-optimized-data'

export default function CandidateDashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [totalSavedJobs, setTotalSavedJobs] = useState(0)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const userData = JSON.parse(userStr)
      setUser(userData)
    }

    // fetchData() // Removed
  }, [])

  // Optimized Data Fetching
  const { data: dashboardData, loading: isLoading } = useOptimizedData({
    key: `candidate_dashboard_${user?.id || 'guest'}`,
    fetchFn: async () => {
      const [savedJobsRes, appsRes] = await Promise.all([
        savedJobsAPI.getSavedJobs(),
        applicationsAPI.getCandidateApplications().catch(() => ({ data: { applications: [] } }))
      ])

      return {
        savedJobs: savedJobsRes.data.savedJobs || [],
        applications: appsRes.data.applications || []
      }
    },
    interval: 5000 // Real-time feel (5s polling)
  })

  useEffect(() => {
    if (dashboardData) {
      setSavedJobs(dashboardData.savedJobs.slice(0, 3).map((item: any) => item.jobs))
      setTotalSavedJobs(dashboardData.savedJobs.length)
      setApplications(dashboardData.applications)
      setLoading(false)
    }
  }, [dashboardData])

  // Initial loading only if no cache
  useEffect(() => {
    if (!isLoading) setLoading(false)
  }, [isLoading])

  // const fetchData = async (isManualRefresh = false) => { // Removed
  //   try {
  //     if (isManualRefresh) {
  //       setRefreshing(true)
  //     }

  //     const jobsResponse = await savedJobsAPI.getSavedJobs()
  //     const savedJobsList = jobsResponse.data.savedJobs || []
  //     setTotalSavedJobs(savedJobsList.length)
  //     setSavedJobs(savedJobsList.slice(0, 3).map((item: any) => item.jobs))

  //     try {
  //       const appsResponse = await applicationsAPI.getCandidateApplications()
  //       setApplications(appsResponse.data.applications || [])
  //     } catch (appError: any) {
  //       if (appError.response?.status === 401) {
  //         setApplications([])
  //       } else {
  //         console.error("Failed to fetch applications:", appError)
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch data:", error)
  //   } finally {
  //     setLoading(false)
  //     if (isManualRefresh) {
  //       setRefreshing(false)
  //     }
  //   }
  // }

  // const handleManualRefresh = () => { // Removed
  //   fetchData(true)
  // }

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || 'applied'
    const styles = {
      interviewing: 'bg-teal-100 text-teal-800 border-teal-200 ring-teal-500/20',
      viewed: 'bg-emerald-100 text-emerald-800 border-emerald-200 ring-emerald-500/20',
      shortlisted: 'bg-cyan-100 text-cyan-800 border-cyan-200 ring-cyan-500/20',
      hired: 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/30',
      submitted: 'bg-slate-100 text-slate-700 border-slate-200',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
      applied: 'bg-slate-100 text-slate-700 border-slate-200'
    }
    // @ts-ignore
    const className = styles[s] || styles.applied

    return (
      <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ring-1 ring-inset transition-all group-hover:shadow-md", className)}>
        {status || 'Applied'}
      </span>
    )
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
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden text-slate-900 font-sans selection:bg-teal-200 selection:text-teal-900">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="relative z-10">

        <main className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-teal-100/50 pb-6 gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  Dashboard
                </h1>
                <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                  Welcome back, <span className="text-teal-600 font-bold">{user?.fullName?.split(" ")[0]}</span> <Sparkles className="h-4 w-4 text-teal-500 fill-teal-100" />
                </p>
              </div>

              {/* <Button // Removed
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="bg-white/80 backdrop-blur-md border-teal-100 text-teal-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 h-10 px-5 rounded-full shadow-sm hover:shadow-lg hover:shadow-teal-900/5 transition-all"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2 text-teal-500", refreshing && "animate-spin")} />
                {refreshing ? 'Syncing...' : 'Sync Data'}
              </Button> */}
            </motion.div>

            {/* Stats Overview - Teal Themed */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatItem
                label="Applications"
                value={applications.length}
                icon={FileText}
                delay={0}
                trend="Total submitted"
              />
              <StatItem
                label="Interviews"
                value={applications.filter((app: any) => ['interviewing'].includes(app.status?.toLowerCase())).length}
                icon={Zap}
                delay={0.1}
                trend="Active processes"
                highlight
              />
              <StatItem
                label="Offers"
                value={applications.filter((app: any) => app.status?.toLowerCase() === 'hired').length}
                icon={Award}
                delay={0.2}
                trend="Pending action"
              />
              <StatItem
                label="Saved Jobs"
                value={totalSavedJobs}
                icon={Bookmark}
                delay={0.3}
                trend="Watchlist"
              />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Main Content: Applications */}
              <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="h-6 w-1 bg-teal-500 rounded-full" />
                    Recent Applications
                  </h2>
                  <Button variant="ghost" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full px-4 group">
                    View all <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>

                <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-black/5">
                  {loading ? (
                    <div className="p-8 space-y-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 animate-pulse">
                          <div className="h-14 w-14 bg-slate-100/50 rounded-2xl" />
                          <div className="space-y-3 flex-1">
                            <div className="h-4 w-1/3 bg-slate-100/50 rounded" />
                            <div className="h-3 w-1/4 bg-slate-50/50 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="py-24 px-6 text-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-teal-50 shadow-inner mb-6 text-teal-200"
                      >
                        <Briefcase className="h-8 w-8 text-teal-400" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3 block">No applications yet</h3>
                      <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed text-lg">
                        Ready to start? Find your dream job and track it here.
                      </p>
                      <Link href="/candidate/jobs" className="inline-block">
                        <Button
                          className="bg-teal-600 hover:bg-teal-500 text-white rounded-full px-10 py-7 text-lg font-bold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-1"
                        >
                          Find a Job
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-teal-50">
                      {applications.map((app: any, index: number) => (
                        <Link href={`/candidate/applications/${app.id}`} key={app.id}>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.9)", scale: 1.01 }}
                            className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 group cursor-pointer transition-all border-l-4 border-transparent hover:border-teal-500"
                          >
                            <div className="h-14 w-14 rounded-2xl border border-teal-100/50 bg-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:shadow-md transition-all">
                              {app.jobs?.recruiter_profiles?.company_logo_url ? (
                                <img src={app.jobs.recruiter_profiles.company_logo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-7 w-7 text-teal-200" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                                {app.jobs?.job_title || 'Unknown Role'}
                              </h4>
                              <p className="text-sm text-slate-500 font-medium truncate flex items-center gap-2">
                                {app.jobs?.recruiter_profiles?.company_name || 'Unknown Company'}
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-slate-400">Remote</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                              <div className="text-right hidden sm:block">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Applied</div>
                                <div className="text-sm font-medium text-slate-600">{formatDate(app.applied_at)}</div>
                              </div>

                              <div className="flex items-center gap-4">
                                {getStatusBadge(app.status)}
                                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-teal-50 text-teal-300 group-hover:bg-teal-100 group-hover:text-teal-600 transition-all transform group-hover:rotate-[-45deg]">
                                  <ArrowRight className="h-5 w-5" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Sidebar Widgets */}
              <motion.div variants={itemVariants} className="space-y-8">

                {/* Profile Card - Premium Glass */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="h-6 w-1 bg-emerald-500 rounded-full" />
                    My Profile
                  </h2>
                  <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-teal-900/10 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-600 transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

                    <div className="relative p-6 z-10 text-white">
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xs font-bold bg-emerald-400/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                          Level 1 Candidate
                        </span>
                      </div>

                      <div className="mb-6">
                        <div className="flex justify-between text-sm font-medium mb-2 opacity-90">
                          <span>Profile Strength</span>
                          <span className="font-bold">20%</span>
                        </div>
                        <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "20%" }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                          />
                        </div>
                      </div>

                      <Link href="/candidate/profile" className="block w-full">
                        <Button
                          className="w-full bg-white text-teal-700 hover:bg-teal-50 border-none h-12 rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Complete Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Saved Jobs List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <div className="h-6 w-1 bg-cyan-500 rounded-full" />
                      Saved Jobs
                    </h2>
                    <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2.5 py-1 rounded-md">{totalSavedJobs}</span>
                  </div>

                  <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-black/5">
                    {loading ? (
                      <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading saved jobs...</div>
                    ) : savedJobs.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-50 transition-colors">
                          <Bookmark className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mb-4">No bookmarks yet</p>
                        <Link href="/candidate/jobs" className="inline-block">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700 font-semibold"
                          >
                            Browse Jobs
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {savedJobs.map((job: any) => (
                          <Link href={`/candidate/jobs/${job.id}`} key={job.id} className="block">
                            <motion.div
                              whileHover={{ x: 5, backgroundColor: "rgba(255, 255, 255, 0.6)" }}
                              className="p-5 cursor-pointer group transition-all"
                            >
                              <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-teal-600 transition-colors">
                                {job.job_title}
                              </h4>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                  {job.recruiter_profiles?.company_name?.[0] || 'C'}
                                </div>
                                <span className="text-xs font-medium text-slate-500 truncate max-w-[120px]">
                                  {job.recruiter_profiles?.company_name}
                                </span>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                        <Link href="/candidate/saved-jobs" className="block">
                          <div className="p-3 bg-teal-50/30 border-t border-teal-50 text-center hover:bg-teal-50/50 transition-colors cursor-pointer">
                            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                              View All Saved
                            </span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

function StatItem({ label, value, icon: Icon, trend, delay, highlight }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(13, 148, 136, 0.1), 0 8px 10px -6px rgba(13, 148, 136, 0.1)" }}
      className={cn(
        "bg-white/80 backdrop-blur-xl border rounded-3xl p-6 shadow-sm relative overflow-hidden group cursor-default",
        highlight ? "border-teal-200 ring-1 ring-teal-100" : "border-white/40 border-b-slate-100"
      )}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</h3>
            <div className="text-4xl font-black text-slate-900 mt-2 tracking-tight group-hover:text-teal-700 transition-colors">{value}</div>
          </div>
          <div className={cn("p-3 rounded-2xl shadow-sm transition-all duration-300 group-hover:rotate-12", highlight ? "bg-teal-100 text-teal-600" : "bg-white text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500")}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-600/80 bg-teal-50/50 w-fit px-2 py-1 rounded-md">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </div>
      </div>
    </motion.div>
  )
}
