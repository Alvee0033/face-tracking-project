"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, ArrowLeft, Loader2, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { savedJobsAPI } from "@/lib/api"
import { ModernJobCard } from "@/components/modern-job-card"
import { motion, AnimatePresence } from "framer-motion"

export default function SavedJobsPage() {
  const router = useRouter()
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchSavedJobs()

    // Refetch when window gets focus (user comes back to tab/page)
    const handleFocus = () => {
      fetchSavedJobs()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchSavedJobs = async () => {
    try {
      setLoading(true)
      const response = await savedJobsAPI.getSavedJobs()
      setSavedJobs(response.data.savedJobs || [])
    } catch (error) {
      console.error("Failed to fetch saved jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSavedJob = async (jobId: string) => {
    try {
      // Optimistic update
      setSavedJobs(prev => prev.filter(item => item.jobs.id !== jobId))
      await savedJobsAPI.removeSavedJob(jobId)
    } catch (error) {
      console.error("Failed to remove saved job:", error)
      fetchSavedJobs() // Revert on error
    }
  }

  const filteredJobs = savedJobs.filter(item =>
    item.jobs.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.jobs.company_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (item.jobs.recruiter_profiles?.company_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50/50">
      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Button
                variant="ghost"
                className="mb-2 pl-0 hover:bg-transparent hover:text-teal-600"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Saved Jobs</h1>
              <p className="text-slate-500 mt-1">
                Your curated collection of opportunities
              </p>
            </div>

            {savedJobs.length > 0 && (
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search saved jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white shadow-sm placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-teal-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading your saved jobs...</p>
            </div>
          ) : savedJobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-12 text-center border-none shadow-xl bg-white/80 backdrop-blur-sm max-w-2xl mx-auto rounded-3xl shadow-teal-900/5">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                  <Bookmark className="h-10 w-10 text-teal-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">No Saved Jobs Yet</h3>
                <p className="text-slate-500 mb-8 text-lg max-w-md mx-auto leading-relaxed">
                  Start exploring thousands of opportunities and bookmark the ones that spark your interest.
                </p>
                <Button
                  onClick={() => router.push('/candidate/jobs')}
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 rounded-full shadow-lg hover:shadow-teal-600/25 transition-all text-base font-medium h-12"
                >
                  Explore Jobs
                </Button>
              </Card>
            </motion.div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">No jobs found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                layout
              >
                <AnimatePresence mode="popLayout">
                  {filteredJobs.map((item: any) => (
                    <ModernJobCard
                      key={item.jobs.id} // Use job ID as key for proper layout animation across filters
                      job={item.jobs}
                      type="saved"
                      onRemove={() => handleRemoveSavedJob(item.jobs.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              <div className="text-center text-sm text-slate-400 py-4">
                Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

