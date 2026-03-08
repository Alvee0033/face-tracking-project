"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { useOptimisticMutation } from "@/lib/hooks/use-optimistic-mutation"
import { useToast } from "@/lib/hooks/use-toast"
import { User, MapPin, Calendar, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
// Layout provides navbar and sidebar

export default function BasicProfileEditPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast, success, error } = useToast()
  const [formInitialized, setFormInitialized] = useState(false)

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    profilePictureUrl: "",
    headline: "",
    dateOfBirth: "",
    profileType: "Student" as "Student" | "Recent Graduate" | "Professional" | "Career Break",
    currentEducationStatus: "",
    expectedGraduationDate: "",
    yearsOfExperience: "",
    currentJobTitle: "",
    currentCompany: "",
    country: "",
    city: "",
    willingToRelocate: false,
    preferredWorkModes: [] as string[],
    bio: "",
    portfolioWebsite: "",
    linkedinUrl: "",
    githubUrl: "",
    behanceUrl: "",
  })

  const workModes = [
    { value: "Remote", label: t('profile.remote') },
    { value: "On-site", label: t('profile.onsite') },
    { value: "Hybrid", label: t('profile.hybrid') }
  ]

  const { data: responseData, loading: dataLoading, refetch } = useOptimizedData({
    key: 'candidate_profile_full',
    fetchFn: async () => {
      const userStr = localStorage.getItem("user")
      if (!userStr) throw new Error("No user")
      const user = JSON.parse(userStr)
      return (await profileAPI.getCandidate(user.id)).data
    }
  })

  // Optimistic mutation for instant profile updates
  const { mutate: updateProfile, isLoading: isSaving } = useOptimisticMutation({
    mutationFn: async (data: any) => {
      const response = await profileAPI.updateCandidate(data)
      return response.data
    },
    cacheKey: 'candidate_profile_full',
    optimisticUpdate: (submitData: any) => {
      // Merge new data with existing cache for instant UI update
      if (!responseData) return responseData

      return {
        ...responseData,
        profile: {
          ...responseData.profile,
          full_name: submitData.fullName,
          phone_number: submitData.phoneNumber,
          profile_picture_url: submitData.profilePictureUrl
        },
        candidateProfile: {
          ...responseData.candidateProfile,
          headline: submitData.headline,
          date_of_birth: submitData.dateOfBirth,
          profile_type: submitData.profileType,
          current_education_status: submitData.currentEducationStatus,
          expected_graduation_date: submitData.expectedGraduationDate,
          years_of_experience: submitData.yearsOfExperience,
          current_job_title: submitData.currentJobTitle,
          current_company: submitData.currentCompany,
          country: submitData.country,
          city: submitData.city,
          willing_to_relocate: submitData.willingToRelocate,
          preferred_work_modes: submitData.preferredWorkModes,
          bio: submitData.bio,
          portfolio_website: submitData.portfolioWebsite,
          linkedin_url: submitData.linkedinUrl,
          github_url: submitData.githubUrl,
          behance_url: submitData.behanceUrl
        }
      }
    },
    onSuccess: () => {
      success("Profile saved!", "Your changes have been saved successfully.")
      // Trigger background refetch to ensure sync
      setTimeout(() => refetch(), 100)
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.message || err.message || "Failed to save profile"
      error("Save failed", errorMessage)
    }
  })

  useEffect(() => {
    // Only populate form data ONCE on initial load, don't overwrite user input
    if (responseData && !formInitialized) {
      // profile data comes from profiles table
      const profileData = responseData.profile || {}
      // candidateProfile comes from candidate_profiles table
      const candidateData = responseData.candidateProfile || {}

      // Store user from local storage to fallback
      const userStr = localStorage.getItem("user")
      const user = userStr ? JSON.parse(userStr) : {}

      setFormData({
        // From profiles table
        fullName: (profileData.full_name || user.fullName || "").toString(),
        phoneNumber: (profileData.phone_number || "").toString(),
        profilePictureUrl: (profileData.profile_picture_url || "").toString(),

        // From candidate_profiles table
        headline: (candidateData.headline || "").toString(),
        dateOfBirth: candidateData.date_of_birth
          ? candidateData.date_of_birth.substring(0, 10) // Convert to YYYY-MM-DD for date input
          : "",
        profileType: (candidateData.profile_type || "Student") as "Student" | "Recent Graduate" | "Professional" | "Career Break",
        currentEducationStatus: (candidateData.current_education_status || "").toString(),
        expectedGraduationDate: candidateData.expected_graduation_date
          ? candidateData.expected_graduation_date.substring(0, 7) // Convert YYYY-MM-DD to YYYY-MM
          : "",
        yearsOfExperience: (candidateData.years_of_experience || "").toString(),
        currentJobTitle: (candidateData.current_job_title || "").toString(),
        currentCompany: (candidateData.current_company || "").toString(),
        country: (candidateData.country || "").toString(),
        city: (candidateData.city || "").toString(),
        willingToRelocate: Boolean(candidateData.willing_to_relocate),
        preferredWorkModes: Array.isArray(candidateData.preferred_work_modes) ? candidateData.preferred_work_modes : [],
        bio: (candidateData.bio || "").toString(),
        portfolioWebsite: (candidateData.portfolio_website || "").toString(),
        linkedinUrl: (candidateData.linkedin_url || "").toString(),
        githubUrl: (candidateData.github_url || "").toString(),
        behanceUrl: (candidateData.behance_url || "").toString(),
      })

      setFormInitialized(true)
    }
  }, [responseData, formInitialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Prepare data according to schema: send null for empty values
      const submitData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null,
        phoneNumber: formData.phoneNumber || null,
        profilePictureUrl: formData.profilePictureUrl || null,
        headline: formData.headline || null,
        currentEducationStatus: formData.currentEducationStatus || null,
        expectedGraduationDate: formData.expectedGraduationDate || null,
        yearsOfExperience: formData.yearsOfExperience || null,
        currentJobTitle: formData.currentJobTitle || null,
        currentCompany: formData.currentCompany || null,
        bio: formData.bio || null,
        portfolioWebsite: formData.portfolioWebsite || null,
        linkedinUrl: formData.linkedinUrl || null,
        githubUrl: formData.githubUrl || null,
        behanceUrl: formData.behanceUrl || null,
        preferredWorkModes: formData.preferredWorkModes.length > 0 ? formData.preferredWorkModes : null,
      }

      // Optimistic update - instant UI feedback, no redirect!
      await updateProfile(submitData)
      // Success toast shown automatically via onSuccess callback
      // User can continue editing or navigate naturally
    } catch (err: any) {
      // Error toast shown automatically via onError callback
      console.error('Profile update error:', err)
    }
  }

  const handleWorkModeToggle = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      preferredWorkModes: prev.preferredWorkModes.includes(mode)
        ? prev.preferredWorkModes.filter(m => m !== mode)
        : [...prev.preferredWorkModes, mode]
    }))
  }

  if (!formInitialized) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dataLoading && !responseData ? (
        <div className="space-y-6 animate-pulse">
          {/* Skeleton Loading State */}
          <div className="h-40 bg-gray-100 rounded-2xl w-full"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-2xl"></div>
            <div className="h-64 bg-gray-100 rounded-2xl"></div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Header & Photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-50 to-emerald-50 mb-8" />
            <div className="relative flex flex-col md:flex-row items-center gap-6 pt-12">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500" />
                <div className="relative h-28 w-28 rounded-full bg-white p-1 shadow-lg">
                  {formData.profilePictureUrl ? (
                    <img
                      src={formData.profilePictureUrl}
                      alt="Profile"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                      <User className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm">
                  <User className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Full Name</Label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="text-lg font-semibold bg-transparent border-transparent hover:border-teal-100 focus:bg-white transition-all px-0 rounded-none border-b-2 focus:ring-0 focus:border-teal-500 h-auto py-1"
                      placeholder="Your Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Professional Headline</Label>
                    <Input
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      className="text-lg text-gray-600 bg-transparent border-transparent hover:border-teal-100 focus:bg-white transition-all px-0 rounded-none border-b-2 focus:ring-0 focus:border-teal-500 h-auto py-1"
                      placeholder="Full Stack Developer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Toast notifications replace inline error/success messages */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Personal Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                      <User className="h-5 w-5" />
                    </div>
                    Personal Details
                  </h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        placeholder="+1 234 567 890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio / Summary</Label>
                      <Textarea
                        className="min-h-[120px] resize-none"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Briefly describe your professional journey..."
                      />
                      <p className="text-xs text-right text-gray-400">
                        {formData.bio?.length || 0}/500
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Location & Preferences */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    Location & Preferences
                  </h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label>Preferred Work Modes</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {workModes.map((mode) => (
                          <div
                            key={mode.value}
                            onClick={() => handleWorkModeToggle(mode.value)}
                            className={`
                                        cursor-pointer relative overflow-hidden rounded-xl p-3 text-center border-2 transition-all duration-200
                                        ${formData.preferredWorkModes.includes(mode.value)
                                ? 'border-teal-500 bg-teal-50/50 text-teal-700 font-semibold shadow-sm'
                                : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50 text-gray-600'}
                                     `}
                          >
                            {formData.preferredWorkModes.includes(mode.value) && (
                              <div className="absolute top-0 right-0 h-3 w-3 bg-teal-500 rounded-bl-lg" />
                            )}
                            <span className="text-sm">{mode.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="willingToRelocate"
                        checked={formData.willingToRelocate}
                        onChange={(e) => setFormData({ ...formData, willingToRelocate: e.target.checked })}
                        className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <Label htmlFor="willingToRelocate" className="cursor-pointer font-medium text-gray-700 m-0">
                        Willing to Relocate
                      </Label>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Professional Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    Professional Status
                  </h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Current Status</Label>
                      <Select
                        value={formData.profileType}
                        onChange={(e) => setFormData({ ...formData, profileType: e.target.value as any })}
                      >
                        <option value="Student">Student</option>
                        <option value="Recent Graduate">Recent Graduate</option>
                        <option value="Professional">Professional</option>
                        <option value="Career Break">Career Break</option>
                      </Select>
                    </div>

                    {/* Dynamic Fields based on Profile Type */}
                    {formData.profileType === "Student" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                          <Label>Current Year</Label>
                          <Select
                            value={formData.currentEducationStatus}
                            onChange={(e) => setFormData({ ...formData, currentEducationStatus: e.target.value })}
                          >
                            <option value="">Select Year</option>
                            <option value="First Year">First Year</option>
                            <option value="Second Year">Second Year</option>
                            <option value="Third Year">Third Year</option>
                            <option value="Final Year">Final Year</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Graduation</Label>
                          <Input
                            type="month"
                            value={formData.expectedGraduationDate}
                            onChange={(e) => setFormData({ ...formData, expectedGraduationDate: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {(formData.profileType === "Professional" || formData.profileType === "Recent Graduate") && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                          <Label>Current Job Title</Label>
                          <Input
                            value={formData.currentJobTitle}
                            onChange={(e) => setFormData({ ...formData, currentJobTitle: e.target.value })}
                            placeholder="e.g. Senior Engineer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Company</Label>
                          <Input
                            value={formData.currentCompany}
                            onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                            placeholder="e.g. Tech Corp"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Years of Experience</Label>
                      <Input
                        value={formData.yearsOfExperience}
                        onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                        placeholder="e.g. 2 years"
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Online Presence */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    Online Presence
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Portfolio Website</Label>
                      <Input
                        value={formData.portfolioWebsite}
                        onChange={(e) => setFormData({ ...formData, portfolioWebsite: e.target.value })}
                        placeholder="https://"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn URL</Label>
                      <Input
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GitHub URL</Label>
                      <Input
                        value={formData.githubUrl}
                        onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>

          <div className="sticky bottom-4 z-50">
            <div className="bg-white/80 backdrop-blur-md border border-gray-200 p-4 rounded-2xl shadow-lg flex justify-end gap-4 max-w-4xl mx-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/candidate/profile/edit")}
                className="hover:bg-gray-100 text-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white min-w-[150px] shadow-lg shadow-teal-500/20 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
