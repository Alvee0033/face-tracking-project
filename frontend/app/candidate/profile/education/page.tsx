"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { Plus, Edit, Trash2, Calendar, GraduationCap, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
// Layout provides navbar and sidebar

interface Education {
  id: string
  education_type: "High School" | "Undergraduate" | "Masters" | "PhD" | "Diploma" | "Certification"
  degree: string
  field_of_study: string
  institution: string
  start_date: string
  end_date: string | null
  is_current: boolean
  grade: string | null
  achievements: string | null
  created_at: string
  updated_at: string
}

export default function EducationManagementPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [educations, setEducations] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingEducation, setEditingEducation] = useState<Education | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    educationType: "Undergraduate" as "High School" | "Undergraduate" | "Masters" | "PhD" | "Diploma" | "Certification",
    degree: "",
    fieldOfStudy: "",
    institution: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    grade: "",
    achievements: ""
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
    if (fullProfileData?.education) {
      setEducations(fullProfileData.education)
      setLoading(false) // Set loading to false once data is available
    } else if (!profileLoading) {
      // If profile is not loading and no data, it means an error occurred or no data exists
      setLoading(false)
    }
  }, [fullProfileData, profileLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      // Convert month strings (YYYY-MM) to full date strings (YYYY-MM-01) for backend
      const formatDateForBackend = (monthString: string | null | undefined): string | null => {
        if (!monthString || monthString.trim() === "") return null
        // Month input returns "YYYY-MM", convert to "YYYY-MM-01"
        return `${monthString}-01`
      }

      // Validate required fields
      if (!formData.startDate || formData.startDate.trim() === "") {
        setError(t('profile.startDate') + " is required")
        setSaving(false)
        return
      }

      const submitData = {
        educationType: formData.educationType,
        degree: formData.degree,
        fieldOfStudy: formData.fieldOfStudy,
        institution: formData.institution,
        startDate: formatDateForBackend(formData.startDate),
        endDate: formData.isCurrent ? null : formatDateForBackend(formData.endDate),
        isCurrent: formData.isCurrent,
        grade: formData.grade && formData.grade.trim() !== "" ? formData.grade : null,
        achievements: formData.achievements && formData.achievements.trim() !== "" ? formData.achievements : null
      }

      if (editingEducation) {
        // Update existing education
        await profileAPI.updateEducation(editingEducation.id, submitData)
        setEducations(educations.map(edu =>
          edu.id === editingEducation.id
            ? { ...edu, ...formData }
            : edu
        ))
        await refetch()
      } else {
        // Add new education
        await profileAPI.addEducation(submitData)
        await refetch()
      }

      setFormData({
        educationType: "Undergraduate",
        degree: "",
        fieldOfStudy: "",
        institution: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        grade: "",
        achievements: ""
      })
      setEditingEducation(null)
      setShowForm(false)
    } catch (err: any) {
      console.error("Failed to save education:", err)
      setError(err.response?.data?.message || t('profile.failedToSaveEducation'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (education: Education) => {
    setEditingEducation(education)
    setFormData({
      educationType: education.education_type,
      degree: education.degree,
      fieldOfStudy: education.field_of_study,
      institution: education.institution,
      startDate: education.start_date,
      endDate: education.end_date || "",
      isCurrent: education.is_current,
      grade: education.grade || "",
      achievements: education.achievements || ""
    })
    setShowForm(true)
  }

  const handleDelete = async (educationId: string) => {
    if (!confirm(t('profile.deleteEducationConfirm'))) return

    try {
      await profileAPI.deleteEducation(educationId)
      setEducations(educations.filter(edu => edu.id !== educationId))
      refetch()
    } catch (err: any) {
      console.error("Failed to delete education:", err)
      setError(err.response?.data?.message || t('profile.failedToDeleteEducation'))
    }
  }

  const handleCancel = () => {
    setFormData({
      educationType: "Undergraduate",
      degree: "",
      fieldOfStudy: "",
      institution: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      grade: "",
      achievements: ""
    })
    setEditingEducation(null)
    setShowForm(false)
    setError("")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  const getEducationTypeColor = (type: string) => {
    switch (type) {
      case "High School": return "text-green-600 bg-green-50"
      case "Undergraduate": return "text-blue-600 bg-blue-50"
      case "Masters": return "text-purple-600 bg-purple-50"
      case "PhD": return "text-red-600 bg-red-50"
      case "Diploma": return "text-orange-600 bg-orange-50"
      case "Certification": return "text-pink-600 bg-pink-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const translateEducationType = (type: string) => {
    switch (type) {
      case "High School": return t('profile.highSchool')
      case "Undergraduate": return t('profile.undergraduate')
      case "Masters": return t('profile.masters')
      case "PhD": return t('profile.phd')
      case "Diploma": return t('profile.diploma')
      case "Certification": return t('profile.certification')
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('profile.education')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('profile.addAcademicBackground')}
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 w-full sm:w-auto whitespace-nowrap"
            disabled={showForm}
          >
            <Plus className="h-4 w-4" />
            {t('profile.addEducation')}
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="educationType">{t('profile.educationType')}</Label>
                  <Select
                    value={formData.educationType}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, educationType: value as "High School" | "Undergraduate" | "Masters" | "PhD" | "Diploma" | "Certification" })
                    }
                  >
                    <option value="Undergraduate">{t('profile.undergraduate')}</option>
                    <option value="High School">{t('profile.highSchool')}</option>
                    <option value="Masters">{t('profile.masters')}</option>
                    <option value="PhD">{t('profile.phd')}</option>
                    <option value="Diploma">{t('profile.diploma')}</option>
                    <option value="Certification">{t('profile.certification')}</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="degree">{t('profile.degree')}</Label>
                  <Input
                    id="degree"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    placeholder="e.g., Bachelor of Science"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fieldOfStudy">{t('profile.fieldOfStudy')}</Label>
                  <Input
                    id="fieldOfStudy"
                    value={formData.fieldOfStudy}
                    onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                    placeholder="e.g., Computer Science"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="institution">{t('profile.institution')}</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g., MIT, Stanford University"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">{t('profile.startDate')}</Label>
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
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={formData.isCurrent}
                  onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isCurrent">{t('profile.currentlyStudying')}</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade">{t('profile.gradeGPA')}</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g., 3.8 GPA, First Class"
                  />
                </div>
                <div>
                  <Label htmlFor="achievements">{t('profile.achievements')}</Label>
                  <Input
                    id="achievements"
                    value={formData.achievements}
                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                    placeholder="e.g., Dean's List, Scholarship"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? t('common.loading') : editingEducation ? t('profile.updateEducation') : t('profile.addEducation')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Education List */}
        {educations.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('profile.noEducationAdded')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('profile.addFirstEducation')}
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t('profile.addYourFirstEducation')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {educations.map((education) => (
              <Card key={education.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{education.degree}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEducationTypeColor(education.education_type)}`}>
                        {translateEducationType(education.education_type)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {education.institution}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(education.start_date)} - {education.is_current ? t('profile.present') : formatDate(education.end_date || "")}
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>{t('profile.fieldOfStudy')}:</strong> {education.field_of_study}
                    </div>

                    {education.grade && (
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>{t('profile.gradeGPA').split('(')[0].trim()}:</strong> {education.grade}
                      </div>
                    )}

                    {education.achievements && (
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-start gap-1">
                          <Award className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span><strong>{t('profile.achievements').split('(')[0].trim()}:</strong> {education.achievements}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(education)}
                      aria-label="Edit education"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(education.id)}
                      aria-label="Delete education"
                      className="h-9 w-9 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
