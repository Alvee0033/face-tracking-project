"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, MapPin, Globe, Edit, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"

export default function RecruiterProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [profileData, setProfileData] = useState<any>(null)
  const [recruiterData, setRecruiterData] = useState<any>(null)

  useEffect(() => {
    // Clear any stale cache on mount
    localStorage.removeItem("profile_last_fetch")
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        router.push("/auth/login")
        return
      }

      const user = JSON.parse(userStr)

      // Force fresh fetch by adding timestamp
      const response = await profileAPI.getRecruiter(user.id)

      console.log('Profile data loaded:', response.data)
      console.log('Profile:', response.data.profile)
      console.log('Recruiter Profile:', response.data.recruiterProfile)

      setProfileData(response.data.profile || {})
      setRecruiterData(response.data.recruiterProfile || {})
    } catch (err: any) {
      console.error("Failed to fetch profile:", err)
      setError(err.response?.data?.message || t('recruiter.failedToLoadProfile'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
        <RecruiterNavbar />
        <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <RecruiterSidebar />
            <div className="lg:col-span-10">
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <div className="text-slate-500 font-medium animate-pulse">{t('recruiter.loadingProfile')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !profileData) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
        <RecruiterNavbar />
        <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <RecruiterSidebar />
            <div className="lg:col-span-10">
              <div className="p-8 bg-white/80 backdrop-blur-xl border border-red-200 rounded-3xl shadow-xl shadow-red-900/5">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Profile Error</h3>
                  <p className="text-red-500 mb-4 font-medium">{error}</p>
                  <Button
                    onClick={() => router.push("/recruiter/profile/setup")}
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
                  >
                    {t('recruiter.setupProfile')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <RecruiterNavbar />
      <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <RecruiterSidebar />

          <div className="lg:col-span-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {t('recruiter.profile')}
                </h1>
                <p className="text-slate-500 font-medium mt-2">Manage your personal and company information</p>
              </div>
              <Button
                onClick={() => router.push("/recruiter/profile/setup")}
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('recruiter.editProfile')}
              </Button>
            </div>

            {/* Personal Information */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                {t('recruiter.personalInformation')}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-teal-100/50 text-teal-600 group-hover:bg-teal-100 group-hover:scale-110 transition-all">
                        <User className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">{t('profile.fullName')}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900 pl-11">
                      {profileData?.full_name || t('recruiter.notProvided')}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-teal-100/50 text-teal-600 group-hover:bg-teal-100 group-hover:scale-110 transition-all">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">{t('profile.phoneNumber')}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-900 pl-11">
                      {profileData?.phone_number || t('recruiter.notProvided')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-100/50 text-teal-600">
                  <Building2 className="h-5 w-5" />
                </div>
                {t('recruiter.companyInformation')}
              </h2>
              <div className="space-y-6">
                {recruiterData?.company_logo_url && (
                  <div className="mb-6 flex justify-center sm:justify-start">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                      <div className="relative p-2 bg-white rounded-xl ring-1 ring-slate-900/5">
                        <img
                          src={recruiterData.company_logo_url}
                          alt={recruiterData.company_name || "Company logo"}
                          className="h-24 w-24 object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-500">{t('recruiter.companyName')}</p>
                    <p className="text-base font-bold text-slate-900">
                      {recruiterData?.company_name || t('recruiter.notProvided')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-500">{t('recruiter.companySize')}</p>
                    <p className="text-base font-bold text-slate-900">
                      {recruiterData?.company_size || <span className="text-slate-400 font-normal italic">{t('recruiter.notProvided')}</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-500">{t('recruiter.industry')}</p>
                    <p className="text-base font-bold text-slate-900">
                      {recruiterData?.industry || <span className="text-slate-400 font-normal italic">{t('recruiter.notProvided')}</span>}
                    </p>
                  </div>
                  {recruiterData?.company_website && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        {t('recruiter.website')}
                      </p>
                      <a
                        href={recruiterData.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-bold text-teal-600 hover:text-teal-700 hover:underline transition-colors flex items-center gap-1 group"
                      >
                        {recruiterData.company_website}
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" />
                      </a>
                    </div>
                  )}
                </div>

                {recruiterData?.company_description && (
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-500 mb-3">{t('recruiter.companyDescription')}</p>
                    <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {recruiterData.company_description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-100/50 text-teal-600">
                  <MapPin className="h-5 w-5" />
                </div>
                {t('recruiter.location')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-teal-200 transition-all duration-300">
                  <p className="text-sm font-semibold text-slate-500 mb-1">{t('profile.country')}</p>
                  <p className="text-base font-bold text-slate-900">
                    {recruiterData?.country || t('recruiter.notProvided')}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-teal-200 transition-all duration-300">
                  <p className="text-sm font-semibold text-slate-500 mb-1">{t('profile.city')}</p>
                  <p className="text-base font-bold text-slate-900">
                    {recruiterData?.city || t('recruiter.notProvided')}
                  </p>
                </div>
                {recruiterData?.address && (
                  <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-teal-200 transition-all duration-300">
                    <p className="text-sm font-semibold text-slate-500 mb-1">{t('recruiter.address')}</p>
                    <p className="text-base font-bold text-slate-900">
                      {recruiterData.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// Helper component for ArrowRight locally if needed, but usually imported
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

