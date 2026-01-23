"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { jobsAPI } from "@/lib/api"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

export default function PostJobPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [skillInput, setSkillInput] = useState("")

  const [formData, setFormData] = useState({
    jobTitle: "",
    department: "",
    jobType: "Full-time" as "Full-time" | "Part-time" | "Contract" | "Freelance" | "Internship" | "Campus Placement",
    workMode: "Remote" as "Remote" | "On-site" | "Hybrid",
    experienceLevel: "Mid Level" as "Entry Level" | "Mid Level" | "Senior" | "Lead/Manager",
    country: "",
    city: "",
    address: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "JPY",
    salaryPeriod: "per year" as "per hour" | "per month" | "per year" | "",
    jobDescription: "",
    responsibilities: "",
    qualifications: "",
    niceToHave: "",
    benefits: "",
    requiredSkills: [] as string[],
    applicationDeadline: "",
    numberOfPositions: 1,
    isStudentFriendly: false,
    minimumExperienceYears: "",
    status: "draft" as "draft" | "active" | "closed"
  })

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "active" | "closed") => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.jobTitle.trim()) {
      setError(t('recruiter.jobTitleRequired'))
      return
    }
    if (formData.jobDescription.length < 100) {
      setError(t('recruiter.jobDescriptionMinChars'))
      return
    }
    if (!formData.responsibilities.trim()) {
      setError(t('recruiter.responsibilitiesRequired'))
      return
    }
    if (!formData.qualifications.trim()) {
      setError(t('recruiter.qualificationsRequired'))
      return
    }
    if (formData.requiredSkills.length === 0) {
      setError(t('recruiter.atLeastOneSkillRequired'))
      return
    }
    if (!formData.country.trim()) {
      setError(t('recruiter.countryRequired'))
      return
    }
    if (!formData.city.trim()) {
      setError(t('recruiter.cityRequired'))
      return
    }

    setLoading(true)

    try {
      const submitData: any = {
        jobTitle: formData.jobTitle.trim(),
        department: formData.department.trim() || null,
        jobType: formData.jobType,
        workMode: formData.workMode,
        experienceLevel: formData.experienceLevel,
        country: formData.country.trim(),
        city: formData.city.trim(),
        address: formData.address.trim() || null,
        salaryCurrency: formData.salaryCurrency,
        salaryPeriod: formData.salaryPeriod || null,
        jobDescription: formData.jobDescription.trim(),
        responsibilities: formData.responsibilities.trim(),
        qualifications: formData.qualifications.trim(),
        niceToHave: formData.niceToHave.trim() || null,
        benefits: formData.benefits.trim() || null,
        requiredSkills: formData.requiredSkills,
        numberOfPositions: formData.numberOfPositions,
        isStudentFriendly: formData.isStudentFriendly,
        status
      }

      // Add optional fields only if they have values
      if (formData.salaryMin) {
        submitData.salaryMin = Number(formData.salaryMin)
      }
      if (formData.salaryMax) {
        submitData.salaryMax = Number(formData.salaryMax)
      }
      if (formData.applicationDeadline) {
        submitData.applicationDeadline = new Date(formData.applicationDeadline).toISOString()
      }
      if (formData.minimumExperienceYears) {
        submitData.minimumExperienceYears = Number(formData.minimumExperienceYears)
      }

      await jobsAPI.create(submitData)
      router.push("/recruiter/jobs")
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || t('recruiter.failedToCreateJob')
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !formData.requiredSkills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, skillInput.trim()]
      })
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter(s => s !== skill)
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill()
    }
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
          {/* Left Sidebar - Navigation */}
          <RecruiterSidebar />

          {/* Main Content */}
          <div className="lg:col-span-10 space-y-6">
            <div className="max-w-4xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="p-2 h-10 w-10 rounded-full bg-white hover:bg-teal-50 text-slate-500 hover:text-teal-600 shadow-sm border border-slate-200 transition-all hover:-translate-x-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {t('recruiter.postANewJob')}
                  </h1>
                  <p className="text-slate-500 font-medium mt-2">Create a compelling job post to attract the best talent</p>
                </div>
              </div>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                {error && (
                  <div className="rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200 p-4 text-sm text-red-600 font-medium shadow-sm animate-slide-up">
                    {error}
                  </div>
                )}

                {/* Basic Information */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    {t('recruiter.basicInformation')}
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="jobTitle" className="text-slate-700 font-medium">
                        {t('jobs.jobTitle')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g., Senior UX Designer"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                        className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="department" className="text-slate-700 font-medium">
                          {t('recruiter.category')}
                        </Label>
                        <Select
                          id="department"
                          value={formData.department}
                          onValueChange={(value: string) => setFormData({ ...formData, department: value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        >
                          <option value="">{t('recruiter.selectCategory')}</option>
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
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="jobType" className="text-slate-700 font-medium">
                          {t('recruiter.jobType')} <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          id="jobType"
                          value={formData.jobType}
                          onValueChange={(value: string) =>
                            setFormData({ ...formData, jobType: value as typeof formData.jobType })
                          }
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                          required
                        >
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Freelance">Freelance</option>
                          <option value="Internship">Internship</option>
                          <option value="Campus Placement">Campus Placement</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="experienceLevel" className="text-slate-700 font-medium">
                          {t('recruiter.experienceLevel')} <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          id="experienceLevel"
                          value={formData.experienceLevel}
                          onValueChange={(value: string) =>
                            setFormData({ ...formData, experienceLevel: value as typeof formData.experienceLevel })
                          }
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                          required
                        >
                          <option value="Entry Level">Entry Level</option>
                          <option value="Mid Level">Mid Level</option>
                          <option value="Senior">Senior</option>
                          <option value="Lead/Manager">Lead/Manager</option>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="workMode" className="text-slate-700 font-medium">
                          {t('recruiter.workMode')} <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          id="workMode"
                          value={formData.workMode}
                          onValueChange={(value: string) =>
                            setFormData({ ...formData, workMode: value as typeof formData.workMode })
                          }
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                          required
                        >
                          <option value="Remote">Remote</option>
                          <option value="On-site">On-site</option>
                          <option value="Hybrid">Hybrid</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    {t('recruiter.location')}
                  </h2>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="country" className="text-slate-700 font-medium">
                          {t('profile.country')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="country"
                          placeholder="e.g., United States"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="city" className="text-slate-700 font-medium">
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="city"
                          placeholder="e.g., San Francisco"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-slate-700 font-medium">
                        {t('recruiter.address')}
                      </Label>
                      <Input
                        id="address"
                        placeholder="e.g., 123 Main St, Suite 100"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Description & Requirements */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    {t('recruiter.jobDescriptionRequirements')}
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="jobDescription" className="text-slate-700 font-medium">
                        {t('jobs.jobDescription')} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="jobDescription"
                        placeholder={t('recruiter.provideDetailedDescription')}
                        value={formData.jobDescription}
                        onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                        className="mt-1.5 min-h-[150px] bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl"
                        required
                      />
                      <p className="text-xs text-slate-400 mt-1 text-right font-medium">
                        {formData.jobDescription.length} {t('recruiter.charactersMinimum')} (100 required)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="responsibilities" className="text-slate-700 font-medium">
                        {t('recruiter.responsibilities')} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="responsibilities"
                        placeholder={t('recruiter.listKeyResponsibilities')}
                        value={formData.responsibilities}
                        onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                        className="mt-1.5 min-h-[120px] bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="qualifications" className="text-slate-700 font-medium">
                        {t('recruiter.qualifications')} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="qualifications"
                        placeholder={t('recruiter.listRequiredQualifications')}
                        value={formData.qualifications}
                        onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                        className="mt-1.5 min-h-[120px] bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="niceToHave" className="text-slate-700 font-medium">
                        {t('recruiter.niceToHave')}
                      </Label>
                      <Textarea
                        id="niceToHave"
                        placeholder={t('recruiter.additionalSkills')}
                        value={formData.niceToHave}
                        onChange={(e) => setFormData({ ...formData, niceToHave: e.target.value })}
                        className="mt-1.5 min-h-[100px] bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="benefits" className="text-slate-700 font-medium">
                        {t('recruiter.benefits')}
                      </Label>
                      <Textarea
                        id="benefits"
                        placeholder={t('recruiter.listBenefits')}
                        value={formData.benefits}
                        onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                        className="mt-1.5 min-h-[100px] bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills & Experience */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    {t('recruiter.skillsExperience')}
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="requiredSkills" className="text-slate-700 font-medium">
                        {t('recruiter.requiredSkills')} <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          id="requiredSkills"
                          placeholder={t('recruiter.typeSkillAndPressEnter')}
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                        <Button
                          type="button"
                          onClick={addSkill}
                          className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 rounded-xl h-11 w-11 p-0"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                      {formData.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          {formData.requiredSkills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-sm font-semibold animate-scale-in"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="hover:text-red-500 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        {t('recruiter.atLeast1SkillRequired')} {formData.requiredSkills.length} {t('recruiter.skillsAdded')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="minimumExperienceYears" className="text-slate-700 font-medium">
                          {t('recruiter.minimumExperienceYears')}
                        </Label>
                        <Input
                          id="minimumExperienceYears"
                          type="number"
                          min="0"
                          placeholder="e.g., 3"
                          value={formData.minimumExperienceYears}
                          onChange={(e) => setFormData({ ...formData, minimumExperienceYears: e.target.value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>

                      <div className="flex items-center space-x-3 mt-8 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <input
                          type="checkbox"
                          id="isStudentFriendly"
                          checked={formData.isStudentFriendly}
                          onChange={(e) => setFormData({ ...formData, isStudentFriendly: e.target.checked })}
                          className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 bg-white"
                        />
                        <Label htmlFor="isStudentFriendly" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                          {t('recruiter.studentFriendly')}
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Suitable for students and recent graduates</p>
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compensation */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    {t('recruiter.compensation')}
                  </h2>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="salaryMin" className="text-slate-700 font-medium">
                          {t('recruiter.minimumSalary')}
                        </Label>
                        <Input
                          id="salaryMin"
                          type="number"
                          min="0"
                          placeholder="e.g., 80000"
                          value={formData.salaryMin}
                          onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>

                      <div>
                        <Label htmlFor="salaryMax" className="text-slate-700 font-medium">
                          {t('recruiter.maximumSalary')}
                        </Label>
                        <Input
                          id="salaryMax"
                          type="number"
                          min="0"
                          placeholder="e.g., 120000"
                          value={formData.salaryMax}
                          onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="salaryCurrency" className="text-slate-700 font-medium">
                          {t('recruiter.currency')}
                        </Label>
                        <Select
                          id="salaryCurrency"
                          value={formData.salaryCurrency}
                          onValueChange={(value: string) => setFormData({ ...formData, salaryCurrency: value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        >
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
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="salaryPeriod" className="text-slate-700 font-medium">
                          {t('recruiter.salaryPeriod')}
                        </Label>
                        <Select
                          id="salaryPeriod"
                          value={formData.salaryPeriod}
                          onValueChange={(value: string) =>
                            setFormData({ ...formData, salaryPeriod: value as typeof formData.salaryPeriod })
                          }
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        >
                          <option value="">{t('recruiter.selectPeriod')}</option>
                          <option value="per hour">{t('recruiter.perHour')}</option>
                          <option value="per month">{t('recruiter.perMonth')}</option>
                          <option value="per year">{t('recruiter.perYear')}</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.7s' }}>
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-teal-500 to-emerald-500 rounded-full" />
                    {t('recruiter.additionalDetails')}
                  </h2>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="numberOfPositions" className="text-slate-700 font-medium">
                          {t('recruiter.numberOfPositions')}
                        </Label>
                        <Input
                          id="numberOfPositions"
                          type="number"
                          min="1"
                          value={formData.numberOfPositions}
                          onChange={(e) => setFormData({ ...formData, numberOfPositions: Number(e.target.value) })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>

                      <div>
                        <Label htmlFor="applicationDeadline" className="text-slate-700 font-medium">
                          {t('recruiter.applicationDeadline')}
                        </Label>
                        <Input
                          id="applicationDeadline"
                          type="date"
                          value={formData.applicationDeadline}
                          onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                          className="mt-1.5 bg-slate-50/50 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl h-11"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 pb-12">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-6 h-12 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                    disabled={loading}
                    onClick={() => router.push("/recruiter/jobs")}
                  >
                    {t('common.cancel')}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="px-6 h-12 rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 font-medium"
                    disabled={loading}
                    onClick={(e) => handleSubmit(e, "draft")}
                  >
                    {t('recruiter.saveAsDraft')}
                  </Button>

                  <Button
                    type="button"
                    className="px-8 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 transition-all duration-300 hover:scale-[1.02] font-semibold"
                    disabled={loading}
                    onClick={(e) => handleSubmit(e, "active")}
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {t('recruiter.posting')}
                      </>
                    ) : (
                      t('recruiter.postJob')
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
