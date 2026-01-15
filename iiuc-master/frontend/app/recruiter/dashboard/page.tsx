"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { jobsAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { useLanguage } from "@/components/language-provider"
import { Briefcase, Users, FileEdit, Plus, MapPin, Calendar, ArrowRight, Loader2, Sparkles, TrendingUp, Search } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

import { useOptimizedData } from '@/lib/hooks/use-optimized-data'

export default function RecruiterDashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [jobs, setJobs] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0 })
  const [loading, setLoading] = useState(true)

  // Optimization Hook
  const { data: dashboardData, loading: isLoading, error: fetchError } = useOptimizedData({
    key: 'recruiter_dashboard_jobs',
    fetchFn: async () => {
      try {
        const response = await jobsAPI.getRecruiterJobs({ limit: 5 })
        return response.data
      } catch (error: any) {
        console.error('Failed to fetch recruiter jobs:', error)
        // Return empty data for errors (backend will auto-create profile if needed)
        return { jobs: [], stats: { total: 0, active: 0, draft: 0 } }
      }
    },
    interval: 5000 // Real-time 
  })

  useEffect(() => {
    if (dashboardData) {
      setJobs(dashboardData.jobs || [])
      setStats(dashboardData.stats || { total: 0, active: 0, draft: 0 })
      setLoading(false)
    }
  }, [dashboardData])

  // Initial load
  useEffect(() => {
    if (!isLoading) setLoading(false)
  }, [isLoading])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden text-slate-900 font-sans selection:bg-teal-200 selection:text-teal-900">

      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <RecruiterNavbar />

        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Navigation */}
            <RecruiterSidebar />

            {/* Main Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="lg:col-span-10 space-y-8"
            >

              {/* Header Section */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-100/50 pb-6">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
                  <p className="text-slate-500 font-medium mt-1">Overview of your recruitment pipeline</p>
                </div>
                <Button
                  onClick={() => router.push("/recruiter/jobs/new")}
                  className="bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all rounded-full h-11 px-6 font-bold"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('dashboard.postNewJob')}
                </Button>
              </motion.div>

              {/* Summary Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatCard
                  label={t('dashboard.totalJobs')}
                  value={stats.total}
                  icon={Briefcase}
                  color="text-teal-600"
                  bg="bg-teal-50"
                  trend="Total Posted"
                  highlight
                />
                <StatCard
                  label={t('dashboard.activeJobs')}
                  value={stats.active}
                  icon={Users}
                  color="text-emerald-600"
                  bg="bg-emerald-50"
                  trend="Accepting applications"
                />
                <StatCard
                  label={t('dashboard.draft')}
                  value={stats.draft}
                  icon={FileEdit}
                  color="text-amber-600"
                  bg="bg-amber-50"
                  trend="Drafts"
                />
              </motion.div>

              {/* Job Postings Section */}
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <div className="h-6 w-1 bg-teal-500 rounded-full" />
                    {t('dashboard.yourJobPostings')}
                  </h2>
                  <Button variant="ghost" onClick={() => router.push("/recruiter/jobs")} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 font-semibold group rounded-full">
                    View All <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>

                {/* Jobs Table Card */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-black/5">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-teal-50/50 border-b border-teal-100/50">
                        <tr>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('dashboard.jobTitle')}
                          </th>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('common.location')}
                          </th>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('dashboard.applicants')}
                          </th>
                          <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {t('dashboard.datePosted')}
                          </th>
                          <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-50/50">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                              <div className="flex items-center justify-center gap-2 animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('dashboard.loadingJobs')}
                              </div>
                            </td>
                          </tr>
                        ) : jobs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center gap-4">
                                <div className="h-16 w-16 rounded-3xl bg-teal-50 flex items-center justify-center shadow-inner">
                                  <Briefcase className="h-8 w-8 text-teal-300" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{t('dashboard.noJobsYet')}</h3>
                                <p className="text-slate-500 max-w-xs mx-auto mb-2">Create your first job posting to start finding great talent.</p>
                                <Button
                                  onClick={() => router.push("/recruiter/jobs/new")}
                                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-full shadow-lg"
                                >
                                  Post First Job
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          jobs.map((job) => (
                            <tr
                              key={job.id}
                              className="group hover:bg-teal-50/30 transition-colors cursor-pointer"
                              onClick={() => router.push(`/recruiter/jobs/${job.id}`)}
                            >
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors text-base">{job.job_title}</span>
                                  <span className="text-xs font-medium text-slate-500 bg-slate-100 w-fit px-2 py-0.5 rounded mt-1">{job.job_type || 'Full-time'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                  <MapPin className="h-4 w-4 text-slate-400" />
                                  {job.city}, {job.country}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={cn(
                                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-all",
                                  (job.application_count || 0) > 0 ? "bg-teal-100 text-teal-700 border border-teal-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                                )}>
                                  <Users className="h-3 w-3 mr-1.5" />
                                  {job.application_count || 0} Applicants
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  {formatDate(job.created_at)}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/recruiter/applications?jobId=${job.id}`);
                                  }}
                                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                >
                                  View Applicants <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, bg, trend, highlight }: any) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(13, 148, 136, 0.1), 0 8px 10px -6px rgba(13, 148, 136, 0.1)" }}
      className={cn(
        "bg-white/80 backdrop-blur-xl border rounded-3xl p-6 shadow-sm flex items-center gap-5 transition-all relative overflow-hidden group",
        highlight ? "border-teal-200 ring-1 ring-teal-100" : "border-white/40"
      )}
    >
      <div className={cn("p-4 rounded-2xl shadow-sm transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110", bg, color)}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded mt-2 w-fit opacity-0 group-hover:opacity-100 transition-opacity">
          <TrendingUp className="h-2.5 w-2.5" /> {trend}
        </div>
      </div>
    </motion.div>
  )
}
import { ChevronRight } from "lucide-react"
