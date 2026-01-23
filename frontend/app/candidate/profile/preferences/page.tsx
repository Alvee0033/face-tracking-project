"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { Save, DollarSign, Calendar, Clock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CountrySelect } from "@/components/ui/select"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
// Layout provides navbar and sidebar

interface JobPreferences {
  id: string
  looking_for: string[]
  preferred_roles: string[]
  preferred_countries?: string[]
  expected_salary_min: number | null
  expected_salary_max: number | null
  salary_currency: string
  available_from: string | null
  notice_period: string | null
  created_at: string
  updated_at: string
}

export default function JobPreferencesPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [preferences, setPreferences] = useState<JobPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    lookingFor: [] as string[],
    preferredRoles: [] as string[],
    preferredCountries: [] as string[],
    expectedSalaryMin: "",
    expectedSalaryMax: "",
    salaryCurrency: "USD",
    availableFrom: "",
    noticePeriod: ""
  })

  const toggleButtonClass = (selected: boolean) =>
    `p-3 rounded-lg border text-left transition-all cursor-pointer select-none flex items-center justify-between gap-2
     ${selected
      ? "border-primary bg-primary/15 text-primary shadow-sm"
      : "border-border hover:border-primary/40 hover:bg-accent/10"}
     focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 active:scale-[0.99]`

  const jobTypes = [
    "Full-time",
    "Part-time",
    "Contract",
    "Freelance",
    "Internship",
    "Campus Placement"
  ]

  const commonRoles = [
    "Software Developer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Mobile Developer",
    "Data Scientist",
    "Data Analyst",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "UI/UX Designer",
    "Product Manager",
    "Project Manager",
    "Business Analyst",
    "Marketing Specialist",
    "Sales Representative"
  ]

  const noticePeriods = [
    "Immediate",
    "1 week",
    "2 weeks",
    "1 month",
    "2 months",
    "3 months"
  ]

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
    if (fullProfileData?.jobPreferences) {
      const prefs = fullProfileData.jobPreferences
      setPreferences(prefs)
      setFormData({
        lookingFor: prefs.looking_for || [],
        preferredRoles: prefs.preferred_roles || [],
        preferredCountries: prefs.preferred_countries || [],
        expectedSalaryMin: prefs.expected_salary_min?.toString() || "",
        expectedSalaryMax: prefs.expected_salary_max?.toString() || "",
        salaryCurrency: prefs.salary_currency || "USD",
        availableFrom: prefs.available_from || "",
        noticePeriod: prefs.notice_period || ""
      })
    }
  }, [fullProfileData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const submitData = {
        lookingFor: (formData.lookingFor || []).map(s => String(s).trim()).filter(Boolean),
        preferredRoles: (formData.preferredRoles || []).map(s => String(s).trim()).filter(Boolean),
        preferredCountries: (formData.preferredCountries || []).map(s => String(s).trim()).filter(Boolean),
        expectedSalaryMin: formData.expectedSalaryMin !== "" ? parseInt(formData.expectedSalaryMin) : null,
        expectedSalaryMax: formData.expectedSalaryMax !== "" ? parseInt(formData.expectedSalaryMax) : null,
        salaryCurrency: String(formData.salaryCurrency || 'USD'),
        availableFrom: formData.availableFrom ? formData.availableFrom : null,
        noticePeriod: formData.noticePeriod ? String(formData.noticePeriod) : null
      }

      await profileAPI.updateJobPreferences(submitData)
      setError("")
      alert(t('profile.preferencesSaved'))
    } catch (err: any) {
      const status = err?.response?.status
      const message = err?.response?.data?.message || err?.message || t('common.error')
      console.error("Failed to save preferences:", status, message, err?.response?.data)
      if (status === 404) {
        setError(t('profile.completeProfileFirst') || "Please complete your basic profile first before setting preferences.")
      } else if (status === 401 || status === 403) {
        setError(t('auth.sessionExpired') || "Your session expired or you don't have permission. Please log in again.")
      } else if (status === 400) {
        setError(message)
      } else {
        setError(t('common.serverError') || "Server error while saving preferences. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }
  const countries = [
    "United States", "United Kingdom", "Canada", "Australia", "India", "Japan", "Germany", "France", "Spain", "Italy", "Brazil", "Mexico", "China", "Singapore", "Netherlands"
  ]

  const toggleCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      preferredCountries: prev.preferredCountries.includes(country)
        ? prev.preferredCountries.filter(c => c !== country)
        : [...prev.preferredCountries, country]
    }))
  }


  const handleJobTypeToggle = (jobType: string) => {
    setFormData(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(jobType)
        ? prev.lookingFor.filter(type => type !== jobType)
        : [...prev.lookingFor, jobType]
    }))
  }

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      preferredRoles: prev.preferredRoles.includes(role)
        ? prev.preferredRoles.filter(r => r !== role)
        : [...prev.preferredRoles, role]
    }))
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t('profile.jobPreferences')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('profile.tellUsOpportunities')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Types */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('profile.whatLookingFor')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.selectJobTypes')}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {jobTypes.map((jobType) => (
                  <button
                    key={jobType}
                    type="button"
                    onClick={() => handleJobTypeToggle(jobType)}
                    className={toggleButtonClass(formData.lookingFor.includes(jobType))}
                    aria-pressed={formData.lookingFor.includes(jobType)}
                  >
                    <div className="font-medium text-sm">{jobType}</div>
                    {formData.lookingFor.includes(jobType) && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Preferred Roles */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('profile.preferredRoles')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.selectRoles')}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {commonRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleToggle(role)}
                    className={toggleButtonClass(formData.preferredRoles.includes(role))}
                    aria-pressed={formData.preferredRoles.includes(role)}
                  >
                    <div className="font-medium text-sm">{role}</div>
                    {formData.preferredRoles.includes(role) && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Preferred Countries */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Preferred Countries</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Select countries where you want to work
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {countries.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => toggleCountry(country)}
                    className={toggleButtonClass(formData.preferredCountries.includes(country))}
                    aria-pressed={formData.preferredCountries.includes(country)}
                  >
                    <div className="font-medium text-sm">{country}</div>
                    {formData.preferredCountries.includes(country) && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Salary Expectations */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('profile.salaryExpectations')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.setSalaryRange')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expectedSalaryMin">{t('profile.minimumSalary')}</Label>
                  <div className="flex">
                    <Input
                      id="expectedSalaryMin"
                      type="number"
                      value={formData.expectedSalaryMin}
                      onChange={(e) => setFormData({ ...formData, expectedSalaryMin: e.target.value })}
                      placeholder="50000"
                      className="rounded-r-none"
                    />
                    <div className="flex items-center px-3 border border-l-0 border-border rounded-r-lg bg-muted">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="expectedSalaryMax">{t('profile.maximumSalary')}</Label>
                  <div className="flex">
                    <Input
                      id="expectedSalaryMax"
                      type="number"
                      value={formData.expectedSalaryMax}
                      onChange={(e) => setFormData({ ...formData, expectedSalaryMax: e.target.value })}
                      placeholder="80000"
                      className="rounded-r-none"
                    />
                    <div className="flex items-center px-3 border border-l-0 border-border rounded-r-lg bg-muted">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="salaryCurrency">{t('profile.currency')}</Label>
                  <Select
                    value={formData.salaryCurrency}
                    onValueChange={(value) => setFormData({ ...formData, salaryCurrency: value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">{t('profile.availability')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('profile.whenCanStart')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="availableFrom">{t('profile.availableFrom')}</Label>
                  <div className="flex">
                    <Input
                      id="availableFrom"
                      type="date"
                      value={formData.availableFrom}
                      onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                      className="rounded-r-none"
                    />
                    <div className="flex items-center px-3 border border-l-0 border-border rounded-r-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="noticePeriod">{t('profile.noticePeriod')}</Label>
                  <Select
                    value={formData.noticePeriod}
                    onValueChange={(value) => setFormData({ ...formData, noticePeriod: value })}
                  >
                    <option value="">{t('profile.selectNoticePeriod')}</option>
                    {noticePeriods.map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? t('common.loading') : t('profile.savePreferences')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
