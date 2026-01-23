"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { Plus, Edit, Trash2, Calendar, MapPin, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"

interface Experience {
  id: string
  experience_type: "Full-time Job" | "Internship" | "Part-time Job" | "Freelance" | "Volunteer Work"
  job_title: string
  company: string
  location: string | null
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export default function ExperienceManagementPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    experienceType: "Full-time Job" as "Full-time Job" | "Internship" | "Part-time Job" | "Freelance" | "Volunteer Work",
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: ""
  })

  // Use optimized data hook
  const { data: fullProfileData, loading: profileLoading, refetch } = useOptimizedData({
    key: 'candidate_profile_full',
    fetchFn: async () => {
      const userStr = localStorage.getItem("user")
      if (!userStr) throw new Error("No user found")
      const user = JSON.parse(userStr)
      const response = await profileAPI.getCandidate(user.id)
      return response.data
    }
  })

  useEffect(() => {
    setLoading(profileLoading)
    if (fullProfileData?.experience) {
      setExperiences(fullProfileData.experience)
    }
  }, [fullProfileData, profileLoading])

  // Convert month input (YYYY-MM) to ISO date string (YYYY-MM-DD) for backend
  // Joi.date() accepts ISO date strings like "YYYY-MM-DD"
  const formatDateForBackend = (monthString: string | null | undefined): string | null => {
    if (!monthString || monthString.trim() === "") return null
    // Month input format: "YYYY-MM"
    // Convert to: "YYYY-MM-DD" (using first day of month)
    if (monthString.length >= 7 && monthString.match(/^\d{4}-\d{2}$/)) {
      return `${monthString}-01`
    }
    // If already in YYYY-MM-DD format, return as is
    if (monthString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return monthString
    }
    return null
  }

  // Convert backend date (YYYY-MM-DD) to month input format (YYYY-MM)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return ""
    // Extract YYYY-MM from YYYY-MM-DD
    if (dateString.length >= 7) {
      return dateString.substring(0, 7)
    }
    return dateString
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      // Validate authentication
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        setError("Please log in to add experience")
        setSaving(false)
        return
      }

      const user = JSON.parse(userStr)

      // Validate candidate profile exists
      const profileCheck = await profileAPI.getCandidate(user.id)
      if (!profileCheck.data.candidateProfile) {
        setError("Please complete your basic profile first before adding experience. Go to Basic Info section.")
        setSaving(false)
        return
      }

      // Client-side validation
      if (!formData.startDate || formData.startDate.trim() === "") {
        setError("Start date is required")
        setSaving(false)
        return
      }

      if (!formData.jobTitle || formData.jobTitle.trim() === "") {
        setError("Job title is required")
        setSaving(false)
        return
      }

      if (!formData.company || formData.company.trim() === "") {
        setError("Company is required")
        setSaving(false)
        return
      }

      // Format dates for backend
      const formattedStartDate = formatDateForBackend(formData.startDate)
      if (!formattedStartDate) {
        setError("Invalid start date format. Please select a valid date.")
        setSaving(false)
        return
      }

      // Prepare data exactly matching backend Joi schema
      // Backend expects: experienceType, jobTitle, company, location, startDate, endDate, isCurrent, description
      const submitData = {
        experienceType: formData.experienceType, // Must be one of the valid enum values
        jobTitle: formData.jobTitle.trim(),
        company: formData.company.trim(),
        location: formData.location && formData.location.trim() !== "" ? formData.location.trim() : null,
        startDate: formattedStartDate, // ISO date string "YYYY-MM-DD" for Joi.date()
        endDate: formData.isCurrent ? null : formatDateForBackend(formData.endDate), // null if current job
        isCurrent: formData.isCurrent, // boolean, not string
        description: formData.description && formData.description.trim() !== "" ? formData.description.trim() : null
      }

      // Validate endDate if not current job
      if (!formData.isCurrent && submitData.endDate === null && formData.endDate.trim() !== "") {
        setError("End date is required when not currently working here")
        setSaving(false)
        return
      }

      console.log('Submitting experience data:', submitData)

      let response: any
      if (editingExperience) {
        // Update existing experience
        response = await profileAPI.updateExperience(editingExperience.id, submitData)
        // Update local state with response data
        setExperiences(experiences.map(exp =>
          exp.id === editingExperience.id
            ? response.data.experience
            : exp
        ))
        await refetch()
      } else {
        // Add new experience
        await profileAPI.addExperience(submitData)
        await refetch()
      }

      // Reset form and close
      resetForm()
      setShowForm(false)
    } catch (err: any) {
      console.error("Failed to save experience:", err)
      console.error("Error response:", err.response?.data)
      console.error("Error status:", err.response?.status)

      // Handle different error types
      if (err.response?.status === 404) {
        setError("Candidate profile not found. Please complete your basic profile first.")
      } else if (err.response?.status === 400) {
        // Validation errors from backend
        const validationDetails = err.response?.data?.details
        if (Array.isArray(validationDetails) && validationDetails.length > 0) {
          const errorMessages = validationDetails.map((detail: any) => {
            const field = detail.path?.join('.') || detail.field || 'field'
            const message = detail.message || detail.msg || 'Invalid value'
            return `${field}: ${message}`
          }).join(", ")
          setError(`Validation error: ${errorMessages}`)
        } else {
          setError(err.response?.data?.message || err.response?.data?.error || "Validation failed. Please check your input.")
        }
      } else if (err.response?.status === 500) {
        // Server error - show detailed message if available
        const serverMessage = err.response?.data?.message || err.response?.data?.error
        setError(serverMessage || "Server error occurred. Please check the backend logs or try again later.")
      } else {
        // Other errors
        setError(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to save experience. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (experience: Experience) => {
    setEditingExperience(experience)
    setFormData({
      experienceType: experience.experience_type,
      jobTitle: experience.job_title || "",
      company: experience.company || "",
      location: experience.location || "",
      startDate: formatDateForInput(experience.start_date), // Convert YYYY-MM-DD to YYYY-MM
      endDate: formatDateForInput(experience.end_date), // Convert YYYY-MM-DD to YYYY-MM
      isCurrent: experience.is_current || false,
      description: experience.description || ""
    })
    setShowForm(true)
    setError("")
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (experienceId: string) => {
    if (!confirm(t('profile.deleteExperienceConfirm'))) return

    try {
      await profileAPI.deleteExperience(experienceId)
      setExperiences(experiences.filter(exp => exp.id !== experienceId))
      refetch()
      setError("")
    } catch (err: any) {
      console.error("Failed to delete experience:", err)
      setError(err.response?.data?.message || "Failed to delete experience. Please try again.")
    }
  }

  const resetForm = () => {
    setFormData({
      experienceType: "Full-time Job",
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: ""
    })
    setEditingExperience(null)
    setError("")
  }

  const handleCancel = () => {
    resetForm()
    setShowForm(false)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })
    } catch {
      return dateString
    }
  }

  const getExperienceTypeColor = (type: string) => {
    switch (type) {
      case "Full-time Job": return "text-blue-600 bg-blue-50"
      case "Internship": return "text-green-600 bg-green-50"
      case "Part-time Job": return "text-orange-600 bg-orange-50"
      case "Freelance": return "text-purple-600 bg-purple-50"
      case "Volunteer Work": return "text-pink-600 bg-pink-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const translateExperienceType = (type: string) => {
    switch (type) {
      case "Full-time Job": return t('profile.fullTimeJob')
      case "Internship": return t('profile.internship')
      case "Part-time Job": return t('profile.partTimeJob')
      case "Freelance": return t('profile.freelance')
      case "Volunteer Work": return t('profile.volunteerWork')
      default: return type
    }
  }

  if (profileLoading && !fullProfileData) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('profile.workExperience')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('profile.addProfessionalExperience')}
          </p>
        </div>
        <Button
          onClick={() => {
            console.log("Add Experience button clicked")
            resetForm()
            setShowForm(true)
            console.log("Form should now be visible")
          }}
          className="gap-2 w-full sm:w-auto whitespace-nowrap"
          type="button"
        >
          <Plus className="h-4 w-4" />
          {t('profile.addExperience')}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingExperience ? t('profile.editExperience') : t('profile.addNewExperience')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experienceType">{t('profile.experienceType')} *</Label>
                <Select
                  id="experienceType"
                  value={formData.experienceType}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, experienceType: value as typeof formData.experienceType })
                  }
                >
                  <option value="Full-time Job">{t('profile.fullTimeJob')}</option>
                  <option value="Internship">{t('profile.internship')}</option>
                  <option value="Part-time Job">{t('profile.partTimeJob')}</option>
                  <option value="Freelance">{t('profile.freelance')}</option>
                  <option value="Volunteer Work">{t('profile.volunteerWork')}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="jobTitle">{t('profile.jobTitle')} *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g., Software Developer"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">{t('profile.company')} *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g., Google, Microsoft"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">{t('common.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">{t('profile.startDate')} *</Label>
                <Input
                  id="startDate"
                  type="month"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">{t('profile.endDate')}</Label>
                <Input
                  id="endDate"
                  type="month"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={formData.isCurrent}
                  placeholder={formData.isCurrent ? t('profile.present') : t('profile.select') + " " + t('profile.endDate').toLowerCase()}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isCurrent"
                checked={formData.isCurrent}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    isCurrent: e.target.checked,
                    endDate: e.target.checked ? "" : formData.endDate
                  })
                }}
                className="rounded"
              />
              <Label htmlFor="isCurrent" className="cursor-pointer">{t('profile.currentlyWorkHere')}</Label>
            </div>

            <div>
              <Label htmlFor="description">{t('profile.jobDescription') || t('jobs.jobDescription')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your role and achievements..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/1000 {t('profile.characters')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t('common.loading') : editingExperience ? t('profile.updateExperience') : t('profile.addExperience')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Experiences List */}
      {experiences.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('profile.noExperienceAdded')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('profile.addFirstExperience')}
            </p>
            <Button onClick={() => {
              resetForm()
              setShowForm(true)
            }} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {t('profile.addYourFirstExperience')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiences.map((experience) => (
            <Card key={experience.id} className="p-6">
              <div className="relative">
                {/* Top row: Job Title, Badge, and Action Buttons */}
                <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold truncate">{experience.job_title}</h3>
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getExperienceTypeColor(experience.experience_type)}`}>
                      {translateExperienceType(experience.experience_type)}
                    </span>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(experience)}
                      aria-label="Edit experience"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(experience.id)}
                      aria-label="Delete experience"
                      className="h-9 w-9 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Company and Location row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building className="h-4 w-4" />
                    <span>{experience.company}</span>
                  </div>
                  {experience.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{experience.location}</span>
                    </div>
                  )}
                </div>

                {/* Duration row */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(experience.start_date)} - {experience.is_current ? t('profile.present') : (experience.end_date ? formatDate(experience.end_date) : "N/A")}
                  </span>
                </div>

                {/* Description */}
                {experience.description && (
                  <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{experience.description}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
