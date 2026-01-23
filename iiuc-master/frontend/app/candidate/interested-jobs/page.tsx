"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, Loader2, TrendingUp, Sparkles, BookOpen, ArrowLeft, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { savedJobsAPI } from "@/lib/api"
import { ModernJobCard } from "@/components/modern-job-card"
import { motion, AnimatePresence } from "framer-motion"

export default function InterestedJobsPage() {
  const router = useRouter()
  const [interestedJobs, setInterestedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchInterestedJobs()

    // Refetch when window gets focus
    const handleFocus = () => {
      fetchInterestedJobs()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchInterestedJobs = async () => {
    try {
      setLoading(true)
      const response = await savedJobsAPI.getInterestedJobs()
      setInterestedJobs(response.data.interestedJobs || [])
    } catch (error) {
      console.error("Failed to fetch interested jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveInterestedJob = async (jobId: string) => {
    try {
      // Optimistic update
      setInterestedJobs(prev => prev.filter(item => item.jobs.id !== jobId))
      await savedJobsAPI.removeInterestedJob(jobId)
    } catch (error) {
      console.error("Failed to remove interested job:", error)
      fetchInterestedJobs() // Revert on error
    }
  }

  const filteredJobs = interestedJobs.filter(item =>
    item.jobs.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.jobs.company_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (item.jobs.recruiter_profiles?.company_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-100/30 rounded-full blur-[120px]" />
      </div>

      <main className="container mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
          >
            <div>
              <Button
                variant="ghost"
                className="mb-2 pl-0 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
                Interested Jobs
                <Heart className="h-8 w-8 text-red-500 fill-red-500 animate-pulse" />
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Career opportunities you're actively pursuing
              </p>
            </div>

            {/* Actions & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full lg:w-auto">
              {interestedJobs.length > 0 && (
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              )}

              {interestedJobs.length > 0 && (
                <Button
                  onClick={() => router.push('/candidate/roadmap')}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-teal-500/30 transition-all w-full md:w-auto px-6 py-3 h-auto rounded-xl font-medium"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Roadmap
                </Button>
              )}
            </div>
          </motion.div>

          {/* AI Insight Card */}
          <AnimatePresence>
            {interestedJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-6 bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-100 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden rounded-2xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="h-32 w-32 text-teal-600" />
                  </div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-xl shadow-md border border-teal-100">
                      <TrendingUp className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-teal-900 text-lg mb-2 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-teal-500" />
                        AI-Powered Career Planning
                      </h4>
                      <p className="text-teal-700 max-w-2xl leading-relaxed">
                        We analyze all your interested jobs together to create a personalized learning roadmap.
                        Click <span className="font-semibold text-teal-800">Generate Roadmap</span> to see your custom path to these opportunities.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <div className="h-20 w-20 bg-teal-100 rounded-full animate-pulse absolute"></div>
                <Loader2 className="h-20 w-20 text-teal-600 animate-spin relative z-10" />
              </div>
              <p className="text-gray-600 font-medium mt-6 text-lg">Loading your interested jobs...</p>
            </div>
          ) : interestedJobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-16 text-center border-2 border-teal-100 shadow-2xl bg-white/90 backdrop-blur-sm max-w-2xl mx-auto rounded-3xl">
                <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-pink-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <Heart className="h-12 w-12 text-red-500" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Interested Jobs Yet</h3>
                <p className="text-gray-600 mb-10 text-lg max-w-md mx-auto leading-relaxed">
                  Mark jobs as "interested" to get AI-powered learning roadmaps that help you prepare for multiple career paths.
                </p>
                <Button
                  onClick={() => router.push('/candidate/jobs')}
                  size="lg"
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-10 py-6 rounded-full shadow-xl hover:shadow-2xl hover:shadow-teal-500/30 transition-all text-lg font-semibold h-auto"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Explore Jobs
                </Button>
              </Card>
            </motion.div>
          ) : filteredJobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">No jobs found matching "{searchQuery}"</p>
              <Button
                onClick={() => setSearchQuery("")}
                variant="outline"
                className="mt-4 border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                Clear Search
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                layout
              >
                <AnimatePresence mode="popLayout">
                  {filteredJobs.map((item: any) => (
                    <ModernJobCard
                      key={item.jobs.id}
                      job={item.jobs}
                      type="interested"
                      onRemove={() => handleRemoveInterestedJob(item.jobs.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              <div className="text-center py-6">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-teal-50 border border-teal-200 rounded-full">
                  <div className="h-2 w-2 bg-teal-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-teal-700">
                    Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

