"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, Briefcase, GraduationCap, Award, FolderOpen, Star, Upload, FileText, Lightbulb, Eye, Save, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
// Layout provides navbar and sidebar

export default function CandidateProfileEditPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [error, setError] = useState("")
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeSuccess, setResumeSuccess] = useState(false)

  // Use optimized data for instant load
  const { data: cachedProfile, loading: cacheLoading } = useOptimizedData({
    key: 'candidate_profile_full',
    fetchFn: async () => {
      const userStr = localStorage.getItem("user")
      if (!userStr) throw new Error("No user found")
      const user = JSON.parse(userStr)
      return (await profileAPI.getCandidate(user.id)).data
    }
  })

  // Initialize form data from cache or wait for fetch
  useEffect(() => {
    if (cachedProfile) {
      const profileData = cachedProfile.profile || {}
      const candidateData = cachedProfile.candidateProfile || {}

      setFormData(prev => ({
        ...prev,
        fullName: profileData.full_name || "",
        phoneNumber: profileData.phone_number || "",
        profilePictureUrl: profileData.profile_picture_url || "",
        headline: candidateData.headline || "",
        profileType: candidateData.profile_type || "Student",
        currentEducationStatus: candidateData.current_education_status || "",
        expectedGraduationDate: candidateData.expected_graduation_date
          ? candidateData.expected_graduation_date.substring(0, 7)
          : "",
        yearsOfExperience: candidateData.years_of_experience || "",
        country: candidateData.country || "",
        city: candidateData.city || "",
        bio: candidateData.bio || "",
        portfolioWebsite: candidateData.portfolio_website || "",
        linkedinUrl: candidateData.linkedin_url || "",
        githubUrl: candidateData.github_url || "",
      }))
      setProfileData(cachedProfile)
      setLoadingData(false)
    }
  }, [cachedProfile])

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    profilePictureUrl: "",
    headline: "",
    profileType: "Student" as "Student" | "Recent Graduate" | "Professional" | "Career Break",
    currentEducationStatus: "",
    expectedGraduationDate: "",
    yearsOfExperience: "",
    country: "",
    city: "",
    bio: "",
    portfolioWebsite: "",
    linkedinUrl: "",
    githubUrl: "",
  })

  // Profile sections with completion status
  const profileSections = [
    {
      id: "basic",
      title: t('profile.basicInformation'),
      description: t('profile.personalDetails'),
      icon: User,
      href: "/candidate/profile/edit/basic",
      completed: false
    },
    {
      id: "skills",
      title: t('profile.skillsExpertise'),
      description: t('profile.skillsDescription'),
      icon: Star,
      href: "/candidate/profile/skills",
      completed: false
    },
    {
      id: "experience",
      title: t('profile.workExperience'),
      description: t('profile.workExperienceDesc'),
      icon: Briefcase,
      href: "/candidate/profile/experience",
      completed: false
    },
    {
      id: "education",
      title: t('profile.education'),
      description: t('profile.educationDesc'),
      icon: GraduationCap,
      href: "/candidate/profile/education",
      completed: false
    },
    {
      id: "projects",
      title: t('profile.projects'),
      description: t('profile.projectsDesc'),
      icon: FolderOpen,
      href: "/candidate/profile/projects",
      completed: false
    },
    {
      id: "certifications",
      title: t('profile.certifications'),
      description: t('profile.certificationsDesc'),
      icon: Award,
      href: "/candidate/profile/certifications",
      completed: false
    },
    {
      id: "preferences",
      title: t('profile.jobPreferences'),
      description: t('profile.salaryExpectations'),
      icon: Settings,
      href: "/candidate/profile/preferences",
      completed: false
    }
  ]

  // No need for separate fetch effect since we use useOptimizedData
  // kept for structure but logic moved to useEffect above

  const fetchProfileData = async () => {
    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) return

      const user = JSON.parse(userStr)
      const response = await profileAPI.getCandidate(user.id)

      setProfileData(response.data)

      // profile data comes from profiles table
      const profileData = response.data.profile || {}
      // candidateProfile comes from candidate_profiles table
      const candidateData = response.data.candidateProfile || {}

      setFormData({
        // From profiles table
        fullName: profileData.full_name || user.fullName || "",
        phoneNumber: profileData.phone_number || "",
        profilePictureUrl: profileData.profile_picture_url || "",

        // From candidate_profiles table
        headline: candidateData.headline || "",
        profileType: candidateData.profile_type || "Student",
        currentEducationStatus: candidateData.current_education_status || "",
        expectedGraduationDate: candidateData.expected_graduation_date
          ? candidateData.expected_graduation_date.substring(0, 7) // Convert YYYY-MM-DD to YYYY-MM
          : "",
        yearsOfExperience: candidateData.years_of_experience || "",
        country: candidateData.country || "",
        city: candidateData.city || "",
        bio: candidateData.bio || "",
        portfolioWebsite: candidateData.portfolio_website || "",
        linkedinUrl: candidateData.linkedin_url || "",
        githubUrl: candidateData.github_url || "",
      })
    } catch (err) {
      console.error("Failed to fetch profile:", err)
    } finally {
      setLoadingData(false)
    }
  }

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profileData) return 0

    let completedSections = 0
    const totalSections = 7

    // Check basic profile
    if (profileData.candidateProfile?.headline && profileData.candidateProfile?.country) {
      completedSections++
    }

    // Check skills
    if (profileData.skills && profileData.skills.length > 0) {
      completedSections++
    }

    // Check experience
    if (profileData.experience && profileData.experience.length > 0) {
      completedSections++
    }

    // Check education
    if (profileData.education && profileData.education.length > 0) {
      completedSections++
    }

    // Check projects
    if (profileData.projects && profileData.projects.length > 0) {
      completedSections++
    }

    // Check certifications
    if (profileData.certifications && profileData.certifications.length > 0) {
      completedSections++
    }

    // Check job preferences
    if (profileData.jobPreferences) {
      completedSections++
    }

    return Math.round((completedSections / totalSections) * 100)
  }

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      setUploadingResume(true)
      setError("")
      setResumeSuccess(false)

      const response = await profileAPI.uploadResume(file)

      console.log('Resume upload response:', response.data)

      setResumeSuccess(true)

      // Show success message
      const data = response.data.data
      alert(`Resume uploaded successfully!\nFilename: ${data.filename}`)

      // Refresh profile data
      await fetchProfileData()

      // Show success state for 3 seconds
      setTimeout(() => {
        setResumeSuccess(false)
      }, 3000)

    } catch (err: any) {
      console.error('Resume upload error:', err)
      setError(err.response?.data?.message || 'Failed to upload resume')
      alert(err.response?.data?.message || 'Failed to upload resume. Please try again.')
    } finally {
      setUploadingResume(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await profileAPI.updateCandidate(formData)

      // Clear profile cache to force refresh on next load
      localStorage.removeItem("profile_last_fetch")

      router.push("/candidate/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save profile")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Portfolio</h1>
          <p className="text-sm text-gray-600">Build and showcase your professional journey.</p>
        </div>

        {/* Profile Completion */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Profile Completion</h3>
            <span className="text-sm font-semibold text-green-600">{calculateCompletion()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateCompletion()}%` }}
            />
          </div>
        </Card>

        {/* Resume Section */}
        <Card className="p-6 bg-white border-2 border-dashed border-gray-300">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {resumeSuccess ? '✅ Resume Uploaded!' : 'Upload your resume.'}
                </h3>
                <p className="text-sm text-gray-600">
                  {resumeSuccess
                    ? 'AI has automatically filled your profile information!'
                    : 'Attract employers by showcasing your full resume. PDF or DOCX, up to 5MB.'}
                </p>
                {uploadingResume && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-teal-600">
                    <div className="animate-spin h-4 w-4 border-2 border-teal-600 border-t-transparent rounded-full"></div>
                    <span>Parsing resume with AI...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Button
                className={`${resumeSuccess
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-teal-600 hover:bg-teal-700'
                  } text-white w-full md:w-auto transition-colors`}
                disabled={uploadingResume}
              >
                {uploadingResume ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : resumeSuccess ? (
                  <>
                    ✓ Uploaded
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Work Experience Section */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <div className="min-w-0">
                {profileData?.experience && profileData.experience.length > 0 ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Experience</h3>
                    <div className="space-y-3">
                      {profileData.experience.slice(0, 2).map((exp: any) => (
                        <div key={exp.id} className="text-sm">
                          <div className="font-medium text-gray-900">{exp.job_title}</div>
                          <div className="text-gray-600">{exp.company}{exp.location ? ` • ${exp.location}` : ''}</div>
                          <div className="text-gray-500">
                            {new Date(exp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                            {" - "}
                            {exp.is_current ? 'Present' : new Date(exp.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                          </div>
                          {exp.description && (
                            <div className="text-gray-600 line-clamp-2 mt-1">{exp.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No work experience added yet.</h3>
                    <p className="text-sm text-gray-600">Showcase your professional background by adding your past roles.</p>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 cursor-pointer w-full md:w-auto"
              onClick={() => router.push("/candidate/profile/experience")}
            >
              <span className="text-lg mr-1">+</span> {cachedProfile?.experience?.length ? 'Manage Experience' : 'Add Work Experience'}
            </Button>
          </div>
        </Card>

        {/* Projects Section */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <div className="min-w-0">
                {profileData?.projects && profileData.projects.length > 0 ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Projects</h3>
                    <div className="space-y-3">
                      {profileData.projects.slice(0, 2).map((proj: any) => (
                        <div key={proj.id} className="text-sm">
                          <div className="font-medium text-gray-900">{proj.project_title} <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{proj.project_type}</span></div>
                          <div className="text-gray-600">{proj.organization || ''}</div>
                          <div className="text-gray-500">
                            {new Date(proj.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                            {" - "}
                            {proj.is_ongoing ? 'Present' : new Date(proj.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                          </div>
                          {proj.description && (
                            <div className="text-gray-600 line-clamp-2 mt-1">{proj.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Your project portfolio is empty.</h3>
                    <p className="text-sm text-gray-600">Add projects to demonstrate your skills and experience.</p>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 cursor-pointer w-full md:w-auto"
              onClick={() => router.push("/candidate/profile/projects")}
            >
              <span className="text-lg mr-1">+</span> {profileData?.projects?.length ? 'Manage Projects' : 'Add a Project'}
            </Button>
          </div>
        </Card>

        {/* Bottom Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl">
            Publish
          </Button>
        </div>
      </div>
    </div>
  )
}

