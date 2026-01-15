"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { jobsAPI, applicationsAPI, savedJobsAPI, externalJobsAPI, cvAPI } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { MapPin, Briefcase, Clock, Building2, DollarSign, Calendar, Loader2, CheckCircle2, XCircle, Bookmark, Share2, TrendingUp, Heart, ExternalLink as ExternalLinkIcon, FileText, ArrowRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { SkillMatchingCard } from "@/components/skill-matching-card"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

// Add custom styles for the modal
const styles = `
  :root {
    --modal-bg-color: white;
  }
  
  .dark {
    --modal-bg-color: #1e1e2d;
  }
`

interface Job {
  id: string
  job_title: string
  department?: string
  job_type: string
  work_mode: string
  experience_level: string
  country: string
  city: string
  job_description: string
  responsibilities?: string
  qualifications?: string
  nice_to_have?: string
  benefits?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  salary_period?: string
  status?: string
  created_at: string
  recruiter_profiles?: {
    company_name: string
    company_size?: string
    industry?: string
  }
  company_name?: string
  job_skills?: Array<{ skill_name: string }>
  // External job specific fields
  platform?: string
  external_url?: string
  thumbnail?: string
  job_highlights?: Array<{ title: string; items: string[] }>
  apply_options?: Array<{ title: string; link: string }>
  posted_date?: string
  extensions?: string[]
}

export default function ViewJobPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applicationSuccess, setApplicationSuccess] = useState(false)
  const [applicationError, setApplicationError] = useState("")
  const [applicationData, setApplicationData] = useState({
    coverLetter: "",
    resumeUrl: ""
  })
  const [hasApplied, setHasApplied] = useState(false)
  const [checkingApplication, setCheckingApplication] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isInterested, setIsInterested] = useState(false)
  const [savingJob, setSavingJob] = useState(false)

  const [candidateProfile, setCandidateProfile] = useState<any>(null)
  const [useProfileResume, setUseProfileResume] = useState(false)

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Parallel data fetching for faster load
    Promise.all([
      loadJob(),
      checkIfApplied(),
      checkJobStatus(),
      fetchCandidateProfile()
    ]).catch(err => console.error('Error loading data:', err))
  }, [params.id])

  const fetchCandidateProfile = async () => {
    try {
      const response = await cvAPI.getProfile()
      if (response.data) {
        setCandidateProfile(response.data.profile || response.data)
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
    }
  }

  const loadJob = async () => {
    try {
      const jobId = params.id as string
      const isExternalJob = jobId.startsWith('external-')

      if (isExternalJob) {
        console.log("Loading external job:", jobId)
        setError("External job details loading - please go back and select from the list")
        setLoading(false)
        return
      }

      // Check cache first
      const cacheKey = `job_${jobId}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 min cache
            setJob(cachedData.data)
            setLoading(false)
            return
          }
        } catch (e) {
          console.warn('Cache parse error', e)
        }
      }

      const response = await jobsAPI.getById(jobId)
      const jobData = response.data.job || response.data

      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: jobData,
        timestamp: Date.now()
      }))

      setJob(jobData)
      setLoading(false)
    } catch (err: any) {
      console.error("Error loading job:", err)
      setError(err.response?.data?.message || "Failed to load job")
      setLoading(false)
    }
  }

  const checkIfApplied = async () => {
    try {
      setCheckingApplication(true)

      // Check cache first
      const cacheKey = `applications_${params.id}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (Date.now() - cachedData.timestamp < 2 * 60 * 1000) { // 2 min cache
            setHasApplied(cachedData.hasApplied)
            setCheckingApplication(false)
            return
          }
        } catch (e) {
          console.warn('Cache parse error', e)
        }
      }

      const response = await applicationsAPI.getCandidateApplications()
      const applications = response.data.applications || []

      const alreadyApplied = applications.some(
        (app: any) => app.job_id === params.id || app.job_id === String(params.id)
      )

      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        hasApplied: alreadyApplied,
        timestamp: Date.now()
      }))

      setHasApplied(alreadyApplied)
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        setHasApplied(false)
      } else {
        console.warn("Could not check application status:", err.response?.status || err.message)
        setHasApplied(false)
      }
    } finally {
      setCheckingApplication(false)
    }
  }

  const checkJobStatus = async () => {
    try {
      const response = await savedJobsAPI.checkJobStatus(params.id as string)
      setIsSaved(response.data.saved)
      setIsInterested(response.data.interested)
    } catch (err) {
      console.error("Error checking job status:", err)
    }
  }

  const handleSaveJob = async () => {
    try {
      setSavingJob(true)
      if (isSaved) {
        await savedJobsAPI.removeSavedJob(params.id as string)
        setIsSaved(false)
      } else {
        await savedJobsAPI.saveJob(params.id as string)
        setIsSaved(true)
      }
    } catch (err) {
      console.error("Error saving job:", err)
    } finally {
      setSavingJob(false)
    }
  }

  const handleInterestedJob = async () => {
    try {
      setSavingJob(true)
      if (isInterested) {
        await savedJobsAPI.removeInterestedJob(params.id as string)
        setIsInterested(false)
      } else {
        await savedJobsAPI.addInterestedJob(params.id as string)
        setIsInterested(true)
      }
    } catch (err) {
      console.error("Error marking job as interested:", err)
    } finally {
      setSavingJob(false)
    }
  }

  const handleApply = () => {
    setShowApplicationForm(true)
  }

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    setApplying(true)
    setApplicationError("")

    try {
      // Validate jobId format
      const jobId = params.id as string
      if (!jobId || typeof jobId !== 'string') {
        setApplicationError(t('jobs.invalidJobId'))
        setApplying(false)
        return
      }

      // Validate and prepare resumeUrl
      let resumeUrl: string | null = null


      if (useProfileResume) {
        if (!candidateProfile?.resume_url) {
          setApplicationError("No resume found in your profile. Please upload one or provide a link.")
          setApplying(false)
          return
        }
        resumeUrl = candidateProfile.resume_url
      } else {
        const trimmedResumeUrl = applicationData.resumeUrl.trim()
        if (trimmedResumeUrl) {
          // If resumeUrl is provided, validate it's a proper URL
          if (!isValidUrl(trimmedResumeUrl)) {
            setApplicationError(t('jobs.invalidResumeUrl'))
            setApplying(false)
            return
          }
          resumeUrl = trimmedResumeUrl
        }
      }

      // Prepare coverLetter - send null if empty
      const coverLetter = applicationData.coverLetter.trim() || null

      // Prepare data matching backend validator expectations
      const submitData = {
        jobId: jobId,
        coverLetter: coverLetter,
        resumeUrl: resumeUrl
      }

      console.log("Submitting application data:", submitData)

      await applicationsAPI.apply(submitData)

      setApplicationSuccess(true)
      setHasApplied(true)

      // Re-check application status to ensure consistency
      setTimeout(async () => {
        await checkIfApplied()
      }, 500)

      // Close modal and show success state after a delay
      setTimeout(() => {
        setShowApplicationForm(false)
        setApplicationSuccess(false)
        // Reset form
        setApplicationData({
          coverLetter: "",
          resumeUrl: ""
        })
      }, 2000)
    } catch (err: any) {
      console.error("Error applying for job:", err)
      console.error("Error details:", err.response?.data)

      // Provide more detailed error message
      let errorMessage = t('jobs.failedToSubmit')
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message

        // If backend says already applied, update the state
        if (errorMessage.includes('already applied')) {
          setHasApplied(true)
          setTimeout(() => {
            setShowApplicationForm(false)
          }, 2000)
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      setApplicationError(errorMessage)
    } finally {
      setApplying(false)
    }
  }

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Elements matching dashboard theme */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s' }} />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-white border border-teal-100 shadow-xl flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-emerald-500 rounded-full border-2 border-white animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Loading Job Details...</h3>
            <p className="text-slate-500 animate-pulse">Fetching the latest opportunity for you</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !job || !job.recruiter_profiles) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || t('jobs.jobNotFound')}</p>
            <Button onClick={() => router.push("/candidate/jobs")}>
              {t('jobs.backToJobs')}
            </Button>
          </div>
        </div>
      </div>
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
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.4
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden text-slate-900 font-sans selection:bg-teal-200 selection:text-teal-900">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="relative z-10">
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              {/* Job Header */}
              <div className="bg-gradient-to-br from-white via-white to-teal-50/30 backdrop-blur-xl rounded-3xl p-8 border border-teal-100/50 shadow-[0_20px_60px_rgba(13,148,136,0.08)] ring-1 ring-teal-500/10 relative overflow-hidden">
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 mb-3">
                        <Briefcase className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">{job.job_type}</span>
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-3 leading-tight tracking-tight">{job.job_title}</h1>
                      <div className="flex items-center gap-3 text-lg text-gray-600 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-teal-600" />
                          <span className="font-medium">{job.recruiter_profiles?.company_name || job.company_name || 'Company'}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-teal-600" />
                          <span>{job.city}, {job.country}</span>
                        </div>
                      </div>
                      {job.platform && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                            <span>via {job.platform}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveJob}
                        disabled={savingJob}
                        className="p-3 rounded-xl hover:bg-teal-50 transition-all disabled:opacity-50 border border-transparent hover:border-teal-200 group"
                        title={isSaved ? "Remove from saved" : "Save for later"}
                      >
                        <Bookmark className={`h-5 w-5 transition-all ${isSaved ? 'fill-teal-600 text-teal-600' : 'text-gray-500 group-hover:text-teal-600'}`} />
                      </button>
                      <button
                        onClick={handleInterestedJob}
                        disabled={savingJob}
                        className="p-3 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50 border border-transparent hover:border-red-200 group"
                        title={isInterested ? "Remove from interested" : "Mark as interested"}
                      >
                        <Heart className={`h-5 w-5 transition-all ${isInterested ? 'fill-red-500 text-red-500' : 'text-gray-500 group-hover:text-red-500'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-teal-100/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('jobs.jobDescription')}</h2>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{job.job_description}</p>
              </div>

              {/* Responsibilities */}
              {job.responsibilities && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('jobs.responsibilities')}</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {job.responsibilities.split('\n').map((item, idx) => (
                      <li key={idx}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Qualifications */}
              {job.qualifications && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('jobs.requiredQualifications')}</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {job.qualifications.split('\n').map((item, idx) => (
                      <li key={idx}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preferred Qualifications */}
              {job.nice_to_have && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('jobs.preferredQualifications')}</h2>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {job.nice_to_have.split('\n').map((item, idx) => (
                      <li key={idx}>{item.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            {/* Right Sidebar */}
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Action Buttons */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-lg shadow-teal-900/5 space-y-3">
                  {checkingApplication ? (
                    <Button disabled className="w-full h-12">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('jobs.checking')}
                    </Button>
                  ) : hasApplied ? (
                    <Button disabled variant="outline" className="w-full h-12 bg-green-50 border-green-200 text-green-600">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('jobs.alreadyApplied')}
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleApply} className="w-full h-14 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 transition-all">
                        <span className="flex items-center gap-2">
                          {t('jobs.applyNow')}
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      </Button>
                      <Button
                        onClick={handleSaveJob}
                        disabled={savingJob}
                        variant="outline"
                        className={`w-full h-12 transition-all ${isSaved ? 'border-teal-600 bg-teal-50 text-teal-700 hover:bg-teal-100' : 'border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600'}`}
                      >
                        <Bookmark className={`mr-2 h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? t('jobs.saved') : t('jobs.saveForLater')}
                      </Button>
                      <Button
                        onClick={handleInterestedJob}
                        disabled={savingJob}
                        variant="outline"
                        className={`w-full h-12 ${isInterested ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-300 text-gray-700 hover:border-red-500 hover:text-red-500'}`}
                      >
                        <Heart className={`mr-2 h-4 w-4 ${isInterested ? 'fill-current' : ''}`} />
                        {isInterested ? t('jobs.interested') : t('jobs.markAsInterested')}
                      </Button>
                    </>
                  )}
                </div>

                {/* Job Details */}
                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('jobs.jobDetails')}</h3>
                  <div className="space-y-3">
                    {(job.salary_min || job.salary_max) && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">{t('jobs.salaryRange')}</p>
                          <p className="font-medium text-gray-900">
                            {job.salary_min && job.salary_max
                              ? `${job.salary_currency || '$'}${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                              : job.salary_min
                                ? `${t('jobs.from')} ${job.salary_currency || '$'}${job.salary_min.toLocaleString()}`
                                : job.salary_max
                                  ? `${t('jobs.upTo')} ${job.salary_currency || '$'}${job.salary_max.toLocaleString()}`
                                  : t('jobs.notSpecified')}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">{t('jobs.experienceLevel')}</p>
                        <p className="font-medium text-gray-900">{job.experience_level}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">{t('jobs.postedOn')}</p>
                        <p className="font-medium text-gray-900">{new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* AI Skill Matching Analysis */}
                <SkillMatchingCard jobId={params.id as string} />

                {/* Skills */}
                {job.job_skills && job.job_skills.length > 0 && (
                  <Card className="p-6 bg-white border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">{t('jobs.skills')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.job_skills.map((skill, idx) => (
                        <span
                          key={`skill-${idx}`}
                          className="px-4 py-2 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/50 text-teal-700 text-sm font-semibold border border-teal-200/50 hover:shadow-md transition-shadow"
                        >
                          {skill.skill_name}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* About the Company */}
                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('jobs.aboutCompany')}</h3>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-600/30">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{job.recruiter_profiles?.company_name || job.company_name}</p>
                      {job.recruiter_profiles && (
                        <Link href="#" className="text-sm text-[#633ff3] hover:underline">{t('jobs.viewCompanyProfile')}</Link>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {job.recruiter_profiles?.company_name || job.company_name} is a leading technology company dedicated to creating cutting-edge solutions. We are committed to excellence and innovation.
                  </p>
                </Card>

                {/* External Job Link */}
                {job.external_url && (
                  <Card className="p-6 bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">View on {job.platform}</h3>
                        <p className="text-sm text-blue-700">Open this job on the external platform to apply</p>
                      </div>
                      <a
                        href={job.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        Apply Now
                      </a>
                    </div>
                  </Card>
                )}
              </div>
            </motion.div>
          </div>

          {/* Application Form Modal */}
          <AnimatePresence>
            {showApplicationForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20"
                  style={{ backgroundColor: isDarkMode ? '#17141f' : 'white' }}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">{t('jobs.applyFor', { jobTitle: job.job_title })}</h2>
                      <button
                        onClick={() => setShowApplicationForm(false)}
                        className="p-1 rounded-full hover:bg-muted"
                      >
                        <XCircle className="h-6 w-6" />
                      </button>
                    </div>

                    {applicationSuccess ? (
                      <div className="py-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-green-600">{t('jobs.applicationSubmitted')}</h3>
                        <p className="text-muted-foreground">
                          {t('jobs.applicationSuccess')}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitApplication} className="space-y-4">
                        {applicationError && (
                          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                            {applicationError}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="coverLetter">{t('jobs.coverLetter')} ({t('jobs.optional')})</Label>
                          <Textarea
                            id="coverLetter"
                            placeholder={t('jobs.coverLetterPlaceholder')}
                            rows={5}
                            value={applicationData.coverLetter}
                            onChange={(e) => setApplicationData({
                              ...applicationData,
                              coverLetter: e.target.value
                            })}
                            className="dark:bg-[#1e1b2c] dark:border-[#272b3f]"
                          />
                        </div>

                        <div className="space-y-4 rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="useProfileResume" className="flex flex-col gap-1">
                              <span>Use Profile Resume</span>
                              <span className="font-normal text-muted-foreground text-xs">
                                Use the resume from your profile
                                {candidateProfile?.resume_url ? ' (Available)' : ' (Not set)'}
                              </span>
                            </Label>
                            <Switch
                              id="useProfileResume"
                              checked={useProfileResume}
                              onCheckedChange={(checked) => {
                                setUseProfileResume(checked)
                                if (checked && candidateProfile?.resume_url) {
                                  // Optionally pre-fill for visual feedback, though we use the toggle state logic
                                }
                              }}
                              disabled={!candidateProfile?.resume_url}
                            />
                          </div>

                          {!useProfileResume && (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <Label htmlFor="resumeUrl">{t('jobs.resumeUrl')} ({t('jobs.optional')})</Label>
                              <Input
                                id="resumeUrl"
                                type="url"
                                placeholder="https://example.com/my-resume.pdf"
                                value={applicationData.resumeUrl}
                                onChange={(e) => setApplicationData({
                                  ...applicationData,
                                  resumeUrl: e.target.value
                                })}
                                className="dark:bg-[#1e1b2c] dark:border-[#272b3f]"
                              />
                              <p className="text-xs text-muted-foreground">
                                {t('jobs.resumeUrlHelp')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <Button
                            type="submit"
                            className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                            disabled={applying}
                          >
                            {applying ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('jobs.submitting')}
                              </>
                            ) : t('jobs.submitApplication')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40">
          {checkingApplication ? (
            <Button disabled className="w-full h-12">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('jobs.checking')}
            </Button>
          ) : hasApplied ? (
            <Button disabled variant="outline" className="w-full h-12 bg-green-50 border-green-200 text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('jobs.alreadyApplied')}
            </Button>
          ) : (
            <Button onClick={handleApply} className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white">
              {t('jobs.applyNow')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
