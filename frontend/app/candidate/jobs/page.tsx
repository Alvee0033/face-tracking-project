"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin, Bookmark, Palette, Code, FileText, ChevronLeft, ChevronRight, Clock, DollarSign, ArrowRight, SlidersHorizontal, X, TrendingUp, ExternalLink, Sparkles, Briefcase, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api, { jobsAPI, profileAPI, externalJobsAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
import { calculateJobMatch, externalJobPlatforms, type JobMatchResult } from "@/lib/jobMatching"
import Link from "next/link"

export default function BrowseJobsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [jobs, setJobs] = useState<any[]>([])
  const [jobsWithMatches, setJobsWithMatches] = useState<Array<{ job: any; match: JobMatchResult }>>([])
  const [candidateProfile, setCandidateProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedExperience, setSelectedExperience] = useState("")
  const [selectedJobType, setSelectedJobType] = useState("")
  const [selectedWorkMode, setSelectedWorkMode] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("")
  const [selectedSalaryPeriod, setSelectedSalaryPeriod] = useState("")
  const [location, setLocation] = useState("")
  const [payRange, setPayRange] = useState(0) // default 0 => no salary filter initially
  const [sortBy, setSortBy] = useState("match") // Default to match-based sorting
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)
  const [platformFilter, setPlatformFilter] = useState("all") // 'all', 'in-platform', 'google'
  const [googleJobsLoading, setGoogleJobsLoading] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['all']) // BDJobs, LinkedIn, etc.

  const requestIdRef = useRef(0)

  useEffect(() => {
    fetchCandidateProfile()
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchJobs()
    }, 300) // Debounce filter changes
    return () => clearTimeout(debounceTimer)
  }, [page, searchKeyword, selectedCategory, selectedExperience, selectedJobType, selectedWorkMode, selectedCurrency, selectedSalaryPeriod, location, payRange, sortBy])

  const fetchCandidateProfile = async () => {
    try {
      // Check cache first for instant load
      const cached = sessionStorage.getItem('candidate_profile')
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          if (Date.now() - cachedData.timestamp < 10 * 60 * 1000) { // 10 min cache
            setCandidateProfile(cachedData.data)
            return
          }
        } catch (e) {
          console.warn('Profile cache error', e)
        }
      }

      const userId = localStorage.getItem('userId')
      if (userId) {
        const response = await profileAPI.getCandidate(userId)
        const profileData = response.data
        setCandidateProfile(profileData)

        // Cache for faster subsequent loads
        sessionStorage.setItem('candidate_profile', JSON.stringify({
          data: profileData,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error("Failed to fetch candidate profile:", error)
    }
  }

  const fetchJobs = async () => {
    try {
      // Check cache first for instant display
      const cacheKey = `jobs_list_${page}_${searchKeyword}_${selectedCategory}_${platformFilter}_${selectedExperience}_${selectedJobType}_${selectedWorkMode}_${selectedCurrency}_${selectedSalaryPeriod}_${location}_${payRange}_${sortBy}`
      const cached = sessionStorage.getItem(cacheKey)

      if (cached && !loading) {
        try {
          const cachedData = JSON.parse(cached)
          if (Date.now() - cachedData.timestamp < 3 * 60 * 1000) { // 3 min cache
            // Show cached data immediately
            setJobs(cachedData.jobs)
            setJobsWithMatches(cachedData.jobsWithMatches || [])
            setTotalResults(cachedData.totalResults)
            setTotalPages(cachedData.totalPages)
            setLoading(false)

            // Fetch fresh data in background
            setTimeout(() => fetchJobsFromAPI(cacheKey), 100)
            return
          }
        } catch (e) {
          console.warn('Jobs cache error', e)
        }
      }

      // No cache or expired - fetch normally
      await fetchJobsFromAPI(cacheKey)
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
      setLoading(false)
    }
  }

  const fetchJobsFromAPI = async (cacheKey: string) => {
    try {
      setLoading(true)
      const currentId = ++requestIdRef.current
      // Build server-supported filters
      const params: any = {
        // Keep server params minimal to avoid backend 500s from unsupported filters
        search: selectedCategory ? `${searchKeyword || ''} ${selectedCategory}`.trim() : (searchKeyword || ''),
        page,
        limit: 10,
      }

      // Add location filter if selected and not "All Locations"
      if (location && location !== '') {
        params.location = location
      }

      const response = await jobsAPI.getAll(params)

      // Start with server results
      let fetched = response.data.jobs || []

      // Client-side filters for those not supported on server
      if (selectedCategory) {
        const cat = selectedCategory.toLowerCase()
        fetched = fetched.filter((j: any) =>
          (j.department && String(j.department).toLowerCase().includes(cat)) ||
          (j.job_title && String(j.job_title).toLowerCase().includes(cat))
        )
      }

      // Client-side experience level filter (matches recruiter page options)
      if (selectedExperience) {
        const exp = selectedExperience.toLowerCase()
        fetched = fetched.filter((j: any) =>
          j.experience_level && String(j.experience_level).toLowerCase().includes(exp)
        )
      }

      if (selectedJobType) {
        fetched = fetched.filter((j: any) => j.job_type === selectedJobType)
      }

      if (selectedWorkMode) {
        fetched = fetched.filter((j: any) => j.work_mode === selectedWorkMode)
      }

      if (selectedCurrency) {
        fetched = fetched.filter((j: any) => j.salary_currency === selectedCurrency)
      }

      if (selectedSalaryPeriod) {
        fetched = fetched.filter((j: any) =>
          j.salary_period && String(j.salary_period).toLowerCase() === selectedSalaryPeriod.toLowerCase()
        )
      }

      // Location filter is now handled server-side, but keep client-side for additional filtering
      if (location && location !== '') {
        const loc = location.trim().toLowerCase()
        if (loc === 'remote') {
          // For remote, filter to only remote jobs
          fetched = fetched.filter((j: any) =>
            (j.work_mode && String(j.work_mode).toLowerCase().includes('remote'))
          )
        } else {
          // For specific locations, filter by city match
          fetched = fetched.filter((j: any) =>
            (j.city && String(j.city).toLowerCase().includes(loc)) ||
            (j.location && String(j.location).toLowerCase().includes(loc))
          )
        }
      }

      if (payRange > 0) {
        fetched = fetched.filter((j: any) => {
          if (!j.salary_max) return false
          return j.salary_max <= payRange
        })
      }

      if (platformFilter === "in-platform") {
        fetched = fetched.filter((j: any) => !j.platform || j.platform === 'internal')
      } else if (platformFilter === "google") {
        fetched = fetched.filter((j: any) => j.platform && j.platform !== 'internal')
      }

      if (currentId !== requestIdRef.current) return // ignore stale responses

      // Calculate match percentage for each job if candidate profile exists
      let jobsWithMatchData = []
      if (candidateProfile) {
        jobsWithMatchData = fetched.map((job: any) => ({
          job,
          match: calculateJobMatch(candidateProfile, job)
        }))

        // Sort by match percentage if sortBy is 'match'
        if (sortBy === 'match') {
          jobsWithMatchData.sort((a: any, b: any) => b.match.matchPercentage - a.match.matchPercentage)
        }

        setJobsWithMatches(jobsWithMatchData)
      } else {
        // No profile, just set jobs without matches
        jobsWithMatchData = fetched.map((job: any) => ({ job, match: null as any }))
        setJobsWithMatches(jobsWithMatchData)
      }

      setJobs(fetched)

      const totalResults = response.data.pagination?.total || fetched.length
      const totalPages = response.data.pagination?.totalPages || 1

      setTotalResults(totalResults)
      setTotalPages(totalPages)

      // Cache the results
      sessionStorage.setItem(cacheKey, JSON.stringify({
        jobs: fetched,
        jobsWithMatches: jobsWithMatchData,
        totalResults,
        totalPages,
        timestamp: Date.now()
      }))

      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch jobs from API:", error)
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    setPage(1)
  }

  const handleImportGoogleJobs = async () => {
    setGoogleJobsLoading(true)
    try {
      // Use the selected category or search keyword, or use a generic search if "All" is selected
      let searchQuery = searchKeyword || selectedCategory || ""

      // If category is empty or "All", use a generic search term
      if (!searchQuery || searchQuery.toLowerCase() === 'all' || searchQuery === '') {
        searchQuery = "Jobs" // Generic search to get various jobs
      }

      const userLocation = location || candidateProfile?.city || candidateProfile?.country || "Dhaka"

      // Determine platforms to search
      const platformsParam = selectedPlatforms.includes('all') ? 'all' : selectedPlatforms.join(',')

      console.log('Fetching external jobs from SerpAPI:', { searchQuery, userLocation, platforms: platformsParam })

      // Call backend API to fetch from SerpAPI Google Jobs
      const response = await externalJobsAPI.searchJobs({
        query: searchQuery,
        location: userLocation,
        platforms: platformsParam
      })

      console.log('SerpAPI Response:', response.data)

      if (response.data.success && response.data.jobs && response.data.jobs.length > 0) {
        const externalJobs = response.data.jobs

        // Map SerpAPI jobs to our internal format
        const mappedJobs = externalJobs.map((job: any, idx: number) => {
          // SerpAPI returns: title, company_name, location, via, description, 
          // extensions, detected_extensions, job_highlights, apply_options, share_link, thumbnail, job_id

          const extensions = job.extensions || []
          const detectedExtensions = job.detected_extensions || {}

          // Parse salary information
          let salaryMin = null
          let salaryMax = null
          let salaryCurrency = 'USD'
          let salaryPeriod = 'per year'

          // Check detected_extensions for salary
          if (detectedExtensions.salary) {
            const salaryText = detectedExtensions.salary
            if (salaryText.includes('$')) {
              salaryCurrency = 'USD'
              const matches = salaryText.match(/\$(\d+(?:,\d+)?(?:\.\d+)?)/g)
              if (matches && matches.length > 0) {
                salaryMin = parseInt(matches[0].replace(/[$,]/g, ''))
                if (matches.length > 1) {
                  salaryMax = parseInt(matches[1].replace(/[$,]/g, ''))
                }
              }
            } else if (salaryText.includes('BDT') || salaryText.includes('৳')) {
              salaryCurrency = 'TK'
              const matches = salaryText.match(/(\d+(?:,\d+)?)/g)
              if (matches && matches.length > 0) {
                salaryMin = parseInt(matches[0].replace(/,/g, ''))
                if (matches.length > 1) {
                  salaryMax = parseInt(matches[1].replace(/,/g, ''))
                }
              }
            }

            if (salaryText.toLowerCase().includes('hour')) {
              salaryPeriod = 'per hour'
            } else if (salaryText.toLowerCase().includes('month')) {
              salaryPeriod = 'per month'
            }
          }

          // Parse job type from detected_extensions.schedule_type
          let jobType = 'Full-time'
          if (detectedExtensions.schedule_type) {
            jobType = detectedExtensions.schedule_type
          } else {
            // Fallback: parse from extensions array
            const jobTypeText = extensions.join(' ').toLowerCase()
            if (jobTypeText.includes('part-time') || jobTypeText.includes('part time')) {
              jobType = 'Part-time'
            } else if (jobTypeText.includes('contract')) {
              jobType = 'Contract'
            } else if (jobTypeText.includes('intern')) {
              jobType = 'Internship'
            }
          }

          // Parse experience level from title
          const titleLower = job.title.toLowerCase()
          let experienceLevel = 'Mid Level'
          if (titleLower.includes('senior') || titleLower.includes('sr.')) {
            experienceLevel = 'Senior'
          } else if (titleLower.includes('lead') || titleLower.includes('staff') || titleLower.includes('principal')) {
            experienceLevel = 'Lead/Manager'
          } else if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('trainee') || titleLower.includes('entry')) {
            experienceLevel = 'Entry Level'
          }

          // Parse work mode
          let workMode = 'On-site'
          if (detectedExtensions.work_from_home) {
            workMode = 'Remote'
          } else {
            const locationText = (job.location || '').toLowerCase()
            const jobTypeText = extensions.join(' ').toLowerCase()
            if (locationText.includes('remote') || jobTypeText.includes('remote') || locationText === 'anywhere') {
              workMode = 'Remote'
            } else if (jobTypeText.includes('hybrid')) {
              workMode = 'Hybrid'
            }
          }

          // Posted date from detected_extensions
          let postedDate = 'Recently'
          if (detectedExtensions.posted_at) {
            postedDate = detectedExtensions.posted_at
          } else if (extensions.length > 0) {
            // First extension is usually the posted date
            const firstExt = extensions[0]
            if (firstExt && (firstExt.includes('ago') || firstExt.includes('day') || firstExt.includes('hour'))) {
              postedDate = firstExt
            }
          }

          return {
            id: `external-${job.id || job.job_id || Date.now()}-${idx}`,
            job_title: job.title,
            job_description: job.description || 'No description available',
            company_name: job.company_name,
            city: job.location,
            country: userLocation.includes('Bangladesh') ? 'Bangladesh' : 'International',
            work_mode: workMode,
            job_type: jobType,
            experience_level: experienceLevel,
            department: 'General',
            salary_min: salaryMin,
            salary_max: salaryMax,
            salary_currency: salaryCurrency,
            salary_period: salaryPeriod,
            platform: job.via, // The platform where job was found (e.g., "LinkedIn", "ZipRecruiter")
            employment_type: jobType,
            created_at: new Date().toISOString(),
            posted_date: postedDate,
            external_url: job.share_link,
            thumbnail: job.thumbnail,
            job_highlights: job.job_highlights, // Array of {title, items[]}
            apply_options: job.apply_options, // Array of {title, link}
            extensions: job.extensions,
            detected_extensions: job.detected_extensions
          }
        })

        console.log(`Successfully loaded ${mappedJobs.length} external jobs from SerpAPI`)

        // Replace existing jobs with ONLY external jobs (don't show placeholder jobs)
        setJobs(mappedJobs)

        // Calculate matches for external jobs only
        if (candidateProfile) {
          const externalJobsWithMatches = mappedJobs.map((job: any) => ({
            job,
            match: calculateJobMatch(candidateProfile, job)
          }))
          setJobsWithMatches(externalJobsWithMatches)
        } else {
          const externalJobsWithoutMatches = mappedJobs.map((job: any) => ({
            job,
            match: null as any
          }))
          setJobsWithMatches(externalJobsWithoutMatches)
        }

        // Automatically switch to external jobs view
        setPlatformFilter('google')
      } else {
        console.log('No external jobs found from SerpAPI')
      }

      // Set filter to show external jobs
      setPlatformFilter('google')
    } catch (error: any) {
      console.error("Error loading external jobs from SerpAPI:", error)
      if (error.response) {
        console.error('API Error:', error.response.data)
      }
      // Still set the filter to show any existing external jobs
      setPlatformFilter('google')
    } finally {
      setGoogleJobsLoading(false)
    }
  }

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
  }

  const getJobIcon = (jobTitle: string) => {
    const title = jobTitle.toLowerCase()
    if (title.includes('design') || title.includes('ux') || title.includes('ui')) {
      return Palette
    } else if (title.includes('developer') || title.includes('engineer')) {
      return Code
    } else {
      return FileText
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Common Navbar */}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{t('jobs.findNextGig')}</h1>
            <button
              onClick={() => { setIsMobileFilterOpen(true); setTimeout(() => setShowMobileDrawer(true), 0) }}
              className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('common.filters') || 'Filters'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="p-4 sm:p-5 bg-white border border-gray-200 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('jobs.searchByKeyword')}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Category (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('jobs.category')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="Technology & Engineering">Technology & Engineering</option>
                      <option value="Data Science & AI/ML">Data Science & AI/ML</option>
                      <option value="Product">Product</option>
                      <option value="Design & Creative">Design & Creative</option>
                      <option value="Marketing & Growth">Marketing & Growth</option>
                      <option value="Sales & Business Development">Sales & Business Development</option>
                      <option value="Customer Support & Service">Customer Support & Service</option>
                      <option value="Finance & Accounting">Finance & Accounting</option>
                      <option value="HR & People">HR & People</option>
                      <option value="Admin & Virtual Assistance">Admin & Virtual Assistance</option>
                      <option value="Legal & Compliance">Legal & Compliance</option>
                      <option value="Operations & Supply Chain">Operations & Supply Chain</option>
                      <option value="Education & Training">Education & Training</option>
                      <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                      <option value="Translation & Localization">Translation & Localization</option>
                      <option value="Writing & Editing">Writing & Editing</option>
                      <option value="Media & Entertainment">Media & Entertainment</option>
                      <option value="Research & Analysis">Research & Analysis</option>
                      <option value="Quality & Compliance">Quality & Compliance</option>
                      <option value="Architecture & Built Environment">Architecture & Built Environment</option>
                      <option value="Security & Risk">Security & Risk</option>
                      <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                      <option value="Tourism & Hospitality">Tourism & Hospitality</option>
                      <option value="Nonprofit & Social Impact">Nonprofit & Social Impact</option>
                      <option value="Sports & Wellness">Sports & Wellness</option>
                      <option value="Events & Experiences">Events & Experiences</option>
                      <option value="Procurement & Vendor">Procurement & Vendor</option>
                      <option value="Documentation & Content Ops">Documentation & Content Ops</option>
                      <option value="GIS & Mapping">GIS & Mapping</option>
                      <option value="Automation">Automation</option>
                      <option value="Specialized Services">Specialized Services</option>
                    </select>
                  </div>
                </details>

                {/* Experience Level (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('jobs.experienceLevel')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2 space-y-2">
                    {["Entry Level", "Mid Level", "Senior", "Lead/Manager"].map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="experience"
                          checked={selectedExperience === level}
                          onChange={() => setSelectedExperience(level)}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </details>

                {/* Job Type (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.jobType')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedJobType}
                      onChange={(e) => setSelectedJobType(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Freelance">Freelance</option>
                      <option value="Internship">Internship</option>
                      <option value="Campus Placement">Campus Placement</option>
                    </select>
                  </div>
                </details>

                {/* Work Mode (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.workMode')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedWorkMode}
                      onChange={(e) => setSelectedWorkMode(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </details>

                {/* Location (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('common.location')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">All Locations</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Barisal">Barisal</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </details>

                {/* Currency (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.currency')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="TK">TK - Taka</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                      <option value="HKD">HKD - Hong Kong Dollar</option>
                      <option value="CHF">CHF - Swiss Franc</option>
                      <option value="SEK">SEK - Swedish Krona</option>
                      <option value="NOK">NOK - Norwegian Krone</option>
                      <option value="DKK">DKK - Danish Krone</option>
                      <option value="PLN">PLN - Polish Zloty</option>
                      <option value="BRL">BRL - Brazilian Real</option>
                      <option value="MXN">MXN - Mexican Peso</option>
                      <option value="ZAR">ZAR - South African Rand</option>
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="KRW">KRW - South Korean Won</option>
                      <option value="THB">THB - Thai Baht</option>
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="MYR">MYR - Malaysian Ringgit</option>
                      <option value="NZD">NZD - New Zealand Dollar</option>
                      <option value="RUB">RUB - Russian Ruble</option>
                      <option value="TRY">TRY - Turkish Lira</option>
                      <option value="ILS">ILS - Israeli Shekel</option>
                    </select>
                  </div>
                </details>

                {/* Salary Period (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.salaryPeriod')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedSalaryPeriod}
                      onChange={(e) => setSelectedSalaryPeriod(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="per hour">{t('recruiter.perHour')}</option>
                      <option value="per month">{t('recruiter.perMonth')}</option>
                      <option value="per year">{t('recruiter.perYear')}</option>
                    </select>
                  </div>
                </details>

                {/* Pay Range (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('jobs.salaryRange')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="200000"
                        step="1000"
                        value={payRange}
                        onChange={(e) => setPayRange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${(payRange / 200000) * 100}%, #e5e7eb ${(payRange / 200000) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between mt-1 text-[11px] text-gray-600">
                        <span>0</span>
                        <span>{payRange.toLocaleString()}</span>
                        <span>200,000</span>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Apply Filters Button */}
                <Button
                  onClick={handleApplyFilters}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 cursor-pointer text-sm"
                >
                  {t('common.apply')}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Side - Job Listings */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {totalResults > 0
                    ? t('jobs.showingResults', { start: String((page - 1) * 10 + 1), end: String(Math.min(page * 10, totalResults)), total: String(totalResults) })
                    : t('jobs.noResults')}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('jobs.sortBy')}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="newest">{t('jobs.newest')}</option>
                    <option value="oldest">{t('jobs.oldest')}</option>
                    <option value="salary-high">{t('jobs.salaryHigh')}</option>
                    <option value="salary-low">{t('jobs.salaryLow')}</option>
                  </select>
                </div>
              </div>

              {/* Platform Filter Tabs */}
              <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                {/* Our Platform */}
                <button
                  onClick={() => {
                    setPlatformFilter("in-platform")
                    // Reload internal jobs if we're currently showing external jobs
                    if (platformFilter === 'google') {
                      fetchJobs()
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${platformFilter === "in-platform"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-teal-500"
                    }`}
                  title="Jobs from our platform"
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm font-medium">Our Platform</span>
                </button>

                {/* All Jobs */}
                <button
                  onClick={() => {
                    setPlatformFilter("all")
                    // Reload internal jobs if we're currently showing only external jobs
                    if (platformFilter === 'google') {
                      fetchJobs()
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${platformFilter === "all"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-teal-500"
                    }`}
                  title="All jobs including external"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">All Jobs</span>
                </button>

                {/* External Jobs */}
                <button
                  onClick={handleImportGoogleJobs}
                  disabled={googleJobsLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${platformFilter === "google"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                    }`}
                  title="Search External Jobs"
                >
                  {googleJobsLoading ? (
                    <div className="h-4 w-4 animate-spin border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">External</span>
                </button>
              </div>
            </div>

            {/* Jobs List */}
            {loading ? (
              <div className="text-center py-12 text-sm text-gray-500">
                {t('dashboard.loadingJobs')}
              </div>
            ) : googleJobsLoading ? (
              <Card className="p-12 text-center bg-white border border-gray-200">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <div className="h-8 w-8 animate-spin border-3 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Loading External Jobs...
                </h3>
                <p className="text-sm text-gray-600">
                  Searching for jobs from external sources. Please wait...
                </p>
              </Card>
            ) : jobs.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-gray-200">
                <p className="text-sm text-gray-500">{t('jobs.noJobsFound')}</p>
              </Card>
            ) : (() => {
              const filteredJobs = jobsWithMatches.filter(({ job }) => {
                // Check if job is external (has platform field set)
                const isExternalJob = job.platform && job.platform !== ''

                if (platformFilter === "in-platform") {
                  // Only show jobs WITHOUT platform (our internal jobs)
                  return !isExternalJob
                }
                if (platformFilter === "google") {
                  // Only show jobs WITH platform (external jobs)
                  return isExternalJob
                }
                return true // "all" - show everything
              })

              if (filteredJobs.length === 0) {
                return (
                  <Card className="p-12 text-center bg-white border border-gray-200">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                      <svg className="h-8 w-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <text x="4" y="18" fontSize="14" fontWeight="bold" fill="currentColor">G</text>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Jobs Found
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Try adjusting your filters or search criteria to see more results.
                    </p>
                    <Button
                      onClick={() => setPlatformFilter("all")}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      View All Jobs
                    </Button>
                  </Card>
                )
              }

              return (
                <div className="space-y-4">
                  {filteredJobs.map(({ job, match }) => {
                    // Format salary for display
                    const formatSalary = () => {
                      if (!job.salary_min && !job.salary_max) return null
                      const currency = job.salary_currency || '$'
                      const isAnnual = job.salary_period === 'per year' || !job.salary_period

                      if (job.salary_min && job.salary_max) {
                        if (isAnnual) {
                          // Convert to thousands for annual salaries (e.g., $100K-$200K)
                          const min = Math.round(job.salary_min / 1000)
                          const max = Math.round(job.salary_max / 1000)
                          return `${currency}${min}-${max}K`
                        } else {
                          // For other periods, show as-is
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
                          const max = Math.round(job.salary_max / 1000)
                          return `Up to ${currency}${max}K`
                        } else {
                          const period = job.salary_period === 'per month' ? '/mo' : job.salary_period === 'per hour' ? '/hr' : ''
                          return `Up to ${currency}${job.salary_max.toLocaleString()}${period}`
                        }
                      }
                    }

                    // Get job type label
                    const getJobTypeLabel = () => {
                      if (job.experience_level) {
                        const level = job.experience_level.toLowerCase()
                        if (level.includes('senior')) return 'Senior'
                        if (level.includes('mid') || level.includes('intermediate')) return 'Mid-level'
                        if (level.includes('junior') || level.includes('entry')) return 'Entry-level'
                      }
                      return job.department || 'Job'
                    }

                    // Format work mode
                    const getWorkMode = () => {
                      if (job.work_mode) {
                        const mode = job.work_mode.toLowerCase()
                        if (mode.includes('remote')) return 'Remote'
                        if (mode.includes('hybrid')) return 'Hybrid'
                        if (mode.includes('onsite') || mode.includes('on-site')) return 'On-site'
                      }
                      return job.city || job.work_mode || 'Location TBD'
                    }

                    // Get employment type
                    const getEmploymentType = () => {
                      // Check if there's a field for employment type, otherwise default
                      return job.employment_type || 'Full Time'
                    }

                    // Get match color
                    const getMatchColor = (percentage: number) => {
                      if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200'
                      if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
                      if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
                      return 'text-gray-600 bg-gray-50 border-gray-200'
                    }

                    return (
                      <Card
                        key={job.id}
                        className="group p-6 bg-white border border-gray-100 hover:border-teal-500/20 shadow-sm hover:shadow-xl transition-all duration-300 relative rounded-2xl overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-teal-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Compatibility Score Badge - Top Right Corner */}
                        {match && (
                          <div className="absolute top-4 right-4 z-10">
                            <div className={`flex flex-col items-end gap-1`}>
                              {/* Main Score Badge */}
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-lg font-bold shadow-md border ${getMatchColor(match.matchPercentage)} backdrop-blur-sm`}>
                                <Sparkles className="h-4 w-4" />
                                <span>{match.matchPercentage}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="relative pr-24">
                          {/* Tags Row */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-600 border border-teal-100">
                              {getJobTypeLabel()}
                            </span>

                            {/* Platform Badge */}
                            {job.platform && job.platform !== 'google' && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                <ExternalLink className="h-3 w-3" />
                                <span>{job.platform}</span>
                              </div>
                            )}
                            {job.platform === 'google' && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                <ExternalLink className="h-3 w-3" />
                                <span>External</span>
                              </div>
                            )}
                          </div>

                          {/* Job Title */}
                          <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors line-clamp-1">
                            {job.job_title}
                          </h3>

                          <div className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                            {job.company_name || job.recruiter_profiles?.company_name || "Company Confidential"}
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            {job.city || "Remote"}
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                            {job.job_description?.substring(0, 140) || 'No description available'}...
                          </p>
                        </div>

                        {/* Match Reasons - Simplified */}
                        {match && match.overallReasons.length > 0 && (
                          <div className="mb-4 py-2 px-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                              <span className="font-medium">Match:</span>
                              <span className="truncate">{match.overallReasons[0]}</span>
                            </div>
                          </div>
                        )}

                        {/* Bottom Section: Attributes and View Job Button */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-50 mt-auto">
                          {/* Job Attributes */}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                            <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md">
                              <Clock className="h-3.5 w-3.5" />
                              {getEmploymentType()}
                            </span>
                            <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md">
                              <MapPin className="h-3.5 w-3.5" />
                              {getWorkMode()}
                            </span>
                            {formatSalary() && (
                              <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-md border border-green-100">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatSalary()}
                              </span>
                            )}
                          </div>

                          {/* View Job Button */}
                          <Link
                            href={job.external_url || `/candidate/jobs/${job.id}`}
                            target={job.external_url ? '_blank' : undefined}
                            prefetch={!job.external_url}
                            className="flex items-center gap-1.5 text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer ml-auto sm:ml-0"
                          >
                            {t('jobs.viewJob')}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )
            })()}

            {/* Pagination */}
            {totalResults > 10 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }).slice(0, 7).map((_, idx) => {
                  const p = idx + 1
                  // Show first 5, last, and current spread when many pages
                  if (totalPages > 7) {
                    const nearCurrent = Math.abs(p - page) <= 1
                    const isEdge = p <= 2 || p >= totalPages - 1
                    if (!nearCurrent && !isEdge) return null
                  }
                  return (
                    <button
                      key={`page-${p}`}
                      onClick={() => goToPage(p)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm cursor-pointer ${p === page ? 'bg-teal-600 text-white' : 'hover:bg-gray-100'
                        }`}
                    >
                      {p}
                    </button>
                  )
                })}

                {totalPages > 7 && page < totalPages - 2 && (
                  <span className="px-2 text-gray-400">...</span>
                )}

                {totalPages > 7 && (
                  <button
                    onClick={() => goToPage(totalPages)}
                    className={`px-3 py-1.5 rounded-lg font-medium text-sm ${page === totalPages ? 'bg-teal-600 text-white' : 'hover:bg-gray-100'
                      }`}
                  >
                    {totalPages}
                  </button>
                )}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${showMobileDrawer ? 'opacity-40' : 'opacity-0'}`}
            onClick={() => { setShowMobileDrawer(false); setTimeout(() => setIsMobileFilterOpen(false), 300) }}
          />
          <div className={`absolute left-0 top-0 h-full w-11/12 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-out ${showMobileDrawer ? 'translate-x-0' : '-translate-x-full'} will-change-transform flex flex-col pt-[env(safe-area-inset-top)]`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <span className="font-semibold text-gray-900">{t('common.filters') || 'Filters'}</span>
              <button onClick={() => { setShowMobileDrawer(false); setTimeout(() => setIsMobileFilterOpen(false), 300) }} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('jobs.searchByKeyword')}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] focus:border-transparent text-sm"
                  />
                </div>

                {/* Category (Accordion) */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('jobs.category')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="Technology & Engineering">Technology & Engineering</option>
                      <option value="Data Science & AI/ML">Data Science & AI/ML</option>
                      <option value="Product">Product</option>
                      <option value="Design & Creative">Design & Creative</option>
                      <option value="Marketing & Growth">Marketing & Growth</option>
                      <option value="Sales & Business Development">Sales & Business Development</option>
                      <option value="Customer Support & Service">Customer Support & Service</option>
                      <option value="Finance & Accounting">Finance & Accounting</option>
                      <option value="HR & People">HR & People</option>
                      <option value="Admin & Virtual Assistance">Admin & Virtual Assistance</option>
                      <option value="Legal & Compliance">Legal & Compliance</option>
                      <option value="Operations & Supply Chain">Operations & Supply Chain</option>
                      <option value="Education & Training">Education & Training</option>
                      <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                      <option value="Translation & Localization">Translation & Localization</option>
                      <option value="Writing & Editing">Writing & Editing</option>
                      <option value="Media & Entertainment">Media & Entertainment</option>
                      <option value="Research & Analysis">Research & Analysis</option>
                      <option value="Quality & Compliance">Quality & Compliance</option>
                      <option value="Architecture & Built Environment">Architecture & Built Environment</option>
                      <option value="Security & Risk">Security & Risk</option>
                      <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                      <option value="Tourism & Hospitality">Tourism & Hospitality</option>
                      <option value="Nonprofit & Social Impact">Nonprofit & Social Impact</option>
                      <option value="Sports & Wellness">Sports & Wellness</option>
                      <option value="Events & Experiences">Events & Experiences</option>
                      <option value="Procurement & Vendor">Procurement & Vendor</option>
                      <option value="Documentation & Content Ops">Documentation & Content Ops</option>
                      <option value="GIS & Mapping">GIS & Mapping</option>
                      <option value="Automation">Automation</option>
                      <option value="Specialized Services">Specialized Services</option>
                    </select>
                  </div>
                </details>

                {/* Experience Level */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('jobs.experienceLevel')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2 space-y-2">
                    {["Entry Level", "Mid Level", "Senior", "Lead/Manager"].map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="experience-mobile"
                          checked={selectedExperience === level}
                          onChange={() => setSelectedExperience(level)}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </details>

                {/* Job Type */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.jobType')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedJobType}
                      onChange={(e) => setSelectedJobType(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Freelance">Freelance</option>
                      <option value="Internship">Internship</option>
                      <option value="Campus Placement">Campus Placement</option>
                    </select>
                  </div>
                </details>

                {/* Work Mode */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.workMode')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedWorkMode}
                      onChange={(e) => setSelectedWorkMode(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </details>

                {/* Location */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('common.location')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">All Locations</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Barisal">Barisal</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </details>

                {/* Currency */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.currency')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="TK">TK - Taka</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="CNY">CNY - Chinese Yuan</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                      <option value="HKD">HKD - Hong Kong Dollar</option>
                      <option value="CHF">CHF - Swiss Franc</option>
                      <option value="SEK">SEK - Swedish Krona</option>
                      <option value="NOK">NOK - Norwegian Krone</option>
                      <option value="DKK">DKK - Danish Krone</option>
                      <option value="PLN">PLN - Polish Zloty</option>
                      <option value="BRL">BRL - Brazilian Real</option>
                      <option value="MXN">MXN - Mexican Peso</option>
                      <option value="ZAR">ZAR - South African Rand</option>
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="SAR">SAR - Saudi Riyal</option>
                      <option value="KRW">KRW - South Korean Won</option>
                      <option value="THB">THB - Thai Baht</option>
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="MYR">MYR - Malaysian Ringgit</option>
                      <option value="NZD">NZD - New Zealand Dollar</option>
                      <option value="RUB">RUB - Russian Ruble</option>
                      <option value="TRY">TRY - Turkish Lira</option>
                      <option value="ILS">ILS - Israeli Shekel</option>
                    </select>
                  </div>
                </details>

                {/* Salary Period */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('recruiter.salaryPeriod')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <select
                      value={selectedSalaryPeriod}
                      onChange={(e) => setSelectedSalaryPeriod(e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#633ff3] text-sm"
                    >
                      <option value="">{t('common.all')}</option>
                      <option value="per hour">{t('recruiter.perHour')}</option>
                      <option value="per month">{t('recruiter.perMonth')}</option>
                      <option value="per year">{t('recruiter.perYear')}</option>
                    </select>
                  </div>
                </details>

                {/* Pay Range */}
                <details className="group">
                  <summary className="list-none cursor-pointer select-none py-1.5 px-1 rounded-md hover:bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm">{t('jobs.salaryRange')}</span>
                    <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="pt-2">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="200000"
                        step="1000"
                        value={payRange}
                        onChange={(e) => setPayRange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${(payRange / 200000) * 100}%, #e5e7eb ${(payRange / 200000) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between mt-1 text-[11px] text-gray-600">
                        <span>0</span>
                        <span>{payRange.toLocaleString()}</span>
                        <span>200,000</span>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Apply & Close */}
                <div className="pt-1 flex items-center gap-2">
                  <Button onClick={() => { handleApplyFilters(); setShowMobileDrawer(false); setTimeout(() => setIsMobileFilterOpen(false), 300) }} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 cursor-pointer text-sm">{t('common.apply')}</Button>
                  <Button variant="outline" onClick={() => { setShowMobileDrawer(false); setTimeout(() => setIsMobileFilterOpen(false), 300) }} className="flex-1 border-gray-300 text-gray-700 py-2 cursor-pointer text-sm">{t('common.cancel')}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

