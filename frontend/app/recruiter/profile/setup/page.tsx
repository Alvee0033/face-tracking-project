"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { profileAPI } from "@/lib/api"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"

export default function RecruiterProfileSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    companyName: "",
    companyLogoUrl: "",
    companyWebsite: "",
    companySize: "",
    industry: "",
    companyDescription: "",
    position: "",
    country: "",
    city: "",
    address: ""
  })

  const countries = [
    "United States", "United Kingdom", "Canada", "Australia", "India", "Japan", "Germany", "France", "Spain", "Italy", "Brazil", "Mexico", "China", "Singapore", "Netherlands"
  ]

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) return

      const user = JSON.parse(userStr)
      const response = await profileAPI.getRecruiter(user.id)

      // profile data comes from profiles table
      const profileData = response.data.profile || {}
      // recruiterProfile comes from recruiter_profiles table
      const recruiterData = response.data.recruiterProfile || {}

      setFormData({
        // From profiles table
        fullName: profileData.full_name || user.fullName || "",
        phoneNumber: profileData.phone_number || "",

        // From recruiter_profiles table
        // Handle "Pending Setup" and other placeholders as empty
        companyName: (recruiterData.company_name === 'Pending Setup') ? "" : (recruiterData.company_name || ""),
        companyLogoUrl: recruiterData.company_logo_url || "",
        companyWebsite: recruiterData.company_website || "",
        companySize: recruiterData.company_size || "",
        industry: recruiterData.industry || "",
        companyDescription: recruiterData.company_description || "",
        position: recruiterData.position || "",
        country: (recruiterData.country === 'Select Country') ? "" : (recruiterData.country || ""),
        city: (recruiterData.city === 'Select City') ? "" : (recruiterData.city || ""),
        address: recruiterData.address || ""
      })
    } catch (err) {
      console.error("Failed to fetch profile:", err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log('Submitting recruiter profile:', formData)

      // Wait for response to ensure we capture any errors
      const response = await profileAPI.updateRecruiter(formData)
      console.log('Profile update response:', response)

      // Clear profile cache
      localStorage.removeItem("profile_last_fetch")

      // Navigate only after success
      router.push("/recruiter/profile")

    } catch (err: any) {
      console.error('Profile update error:', err)
      console.error('Error response:', err.response?.data)
      const errorMessage = err.response?.data?.details || err.response?.data?.message || "Failed to save profile"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden font-inter">
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
        </div>

        <RecruiterNavbar />
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <RecruiterSidebar />
            <div className="lg:col-span-10">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <div className="text-center text-slate-500 font-medium animate-pulse">Loading profile...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden font-inter">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <RecruiterNavbar />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <RecruiterSidebar />

          <div className="lg:col-span-10 animate-fade-in">
            <div className="space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-teal-100/50">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Edit Profile</h1>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200 p-4 text-sm text-red-600 font-medium shadow-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    Personal Information
                  </h2>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name *</Label>
                      <Input
                        id="fullName"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position" className="text-slate-700 font-medium">Position / Job Title</Label>
                      <Input
                        id="position"
                        placeholder="e.g. HR Manager"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-100/50 text-teal-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    Company Information
                  </h2>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-slate-700 font-medium">Company Name *</Label>
                      <Input
                        id="companyName"
                        required
                        placeholder="e.g. Google"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyLogoUrl" className="text-slate-700 font-medium">Company Logo URL</Label>
                      <Input
                        id="companyLogoUrl"
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={formData.companyLogoUrl}
                        onChange={(e) => setFormData({ ...formData, companyLogoUrl: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="companySize" className="text-slate-700 font-medium">Company Size</Label>
                        <Select
                          id="companySize"
                          value={formData.companySize}
                          onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                          className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        >
                          <option value="">Select</option>
                          <option value="1-10">1-10</option>
                          <option value="11-50">11-50</option>
                          <option value="51-200">51-200</option>
                          <option value="201-500">201-500</option>
                          <option value="500+">500+</option>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industry" className="text-slate-700 font-medium">Industry</Label>
                        <Input
                          id="industry"
                          placeholder="e.g. Technology"
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite" className="text-slate-700 font-medium">Website</Label>
                      <Input
                        id="companyWebsite"
                        type="url"
                        placeholder="https://company.com"
                        value={formData.companyWebsite}
                        onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyDescription" className="text-slate-700 font-medium">Company Description</Label>
                      <Textarea
                        id="companyDescription"
                        placeholder="Tell candidates about your company..."
                        value={formData.companyDescription}
                        onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl min-h-[120px]"
                        rows={5}
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-100/50 text-teal-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    Location
                  </h2>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-slate-700 font-medium">Country *</Label>
                        <Input
                          id="country"
                          required
                          placeholder="e.g. USA"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-slate-700 font-medium">City *</Label>
                        <Input
                          id="city"
                          required
                          placeholder="e.g. San Francisco"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-slate-700 font-medium">Address</Label>
                      <Input
                        id="address"
                        placeholder="Full address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto min-w-[140px] bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 rounded-xl h-12 font-semibold transition-all hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

