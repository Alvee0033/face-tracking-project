"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { Plus, Edit, Trash2, CheckCircle2, AlertCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
import { SkillExam } from "@/components/skill-exam"
// Layout provides navbar and sidebar

interface Skill {
  id: string
  skill_name: string
  skill_level: "Beginner" | "Intermediate" | "Advanced" | "Expert"
  created_at: string
  updated_at: string
}

interface UnverifiedSkill {
  id: string
  skill_name: string
  skill_level: "Beginner" | "Intermediate" | "Advanced" | "Expert"
  created_at: string
  updated_at: string
}

export default function SkillsManagementPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [skills, setSkills] = useState<Skill[]>([])
  const [unverifiedSkills, setUnverifiedSkills] = useState<UnverifiedSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | UnverifiedSkill | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [showExam, setShowExam] = useState(false)
  const [currentExam, setCurrentExam] = useState<any>(null)
  const [loadingExam, setLoadingExam] = useState(false)

  const [formData, setFormData] = useState({
    skillName: "",
    skillLevel: "Beginner" as "Beginner" | "Intermediate" | "Advanced" | "Expert"
  })

  // Use optimized data hook for instant load
  const { data: fullProfileData, loading: profileLoading, refetch: refetchProfile } = useOptimizedData({
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
    if (fullProfileData?.skills) {
      setSkills(fullProfileData.skills)
    }
  }, [fullProfileData])

  useEffect(() => {
    fetchUnverifiedSkills()
  }, [])

  const fetchUnverifiedSkills = async () => {
    try {
      const response = await profileAPI.getUnverifiedSkills()
      setUnverifiedSkills(response.data.unverifiedSkills || [])
    } catch (err) {
      console.error("Failed to fetch unverified skills:", err)
    }
  }

  // Reload both sources
  const refreshAll = async () => {
    refetchProfile()
    fetchUnverifiedSkills()
  }

  const handleStartExam = async (unverifiedSkillId: string) => {
    setLoadingExam(true)
    try {
      const response = await profileAPI.generateSkillExam(unverifiedSkillId)
      // Remove correct answers from questions for display
      const examForDisplay = {
        ...response.data.exam,
        questions: response.data.exam.questions.map((q: any) => ({
          question: q.question,
          options: q.options
        }))
      }
      setCurrentExam(examForDisplay)
      setShowExam(true)
    } catch (err: any) {
      console.error("Failed to generate exam:", err)
      alert(err.response?.data?.message || "Failed to generate exam. Please try again.")
    } finally {
      setLoadingExam(false)
    }
  }

  const handleSubmitExam = async (examId: string, answers: Array<{ questionIndex: number; answer: string }>) => {
    try {
      const response = await profileAPI.submitSkillExam({ examId, answers })
      if (response.data.passed) {
        // Refresh skills after successful verification
        await refreshAll()
      }
      return response.data
    } catch (err: any) {
      console.error("Failed to submit exam:", err)
      throw err
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      if (editingSkill) {
        // Update existing skill
        const response = await profileAPI.updateSkill(editingSkill.id, formData)
        if (response.data.requiresVerification) {
          // Skill moved to unverified, refresh
          await refreshAll()
          alert("Skill updated. Please verify it by taking an exam.")
        } else {
          // Update in place
          setSkills(skills.map(skill =>
            skill.id === editingSkill.id
              ? { ...skill, skill_name: formData.skillName, skill_level: formData.skillLevel }
              : skill
          ))
        }
      } else {
        // Add new skill
        const response = await profileAPI.addSkill(formData)
        if (response.data.requiresVerification) {
          // Refresh to show in unverified section
          await refreshAll()
          alert("Skill added. Please verify it by taking an exam.")
        }
      }

      setFormData({ skillName: "", skillLevel: "Beginner" })
      setEditingSkill(null)
      setShowForm(false)
    } catch (err: any) {
      console.error("Failed to save skill:", err)
      setError(err.response?.data?.message || t('profile.failedToSaveSkill'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (skill: Skill | UnverifiedSkill) => {
    setEditingSkill(skill)
    setFormData({
      skillName: skill.skill_name,
      skillLevel: skill.skill_level
    })
    setShowForm(true)
  }

  const handleDelete = async (skillId: string) => {
    if (!confirm(t('profile.deleteSkillConfirm'))) return

    try {
      await profileAPI.deleteSkill(skillId)
      await refreshAll() // Refresh both lists
    } catch (err: any) {
      console.error("Failed to delete skill:", err)
      setError(err.response?.data?.message || t('profile.failedToDeleteSkill'))
    }
  }

  const handleCancel = () => {
    setFormData({ skillName: "", skillLevel: "Beginner" })
    setEditingSkill(null)
    setShowForm(false)
    setError("")
  }

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "text-green-600 bg-green-50"
      case "Intermediate": return "text-blue-600 bg-blue-50"
      case "Advanced": return "text-orange-600 bg-orange-50"
      case "Expert": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const translateSkillLevel = (level: string) => {
    switch (level) {
      case "Beginner": return t('profile.beginner')
      case "Intermediate": return t('profile.intermediate')
      case "Advanced": return t('profile.advanced')
      case "Expert": return t('profile.expert')
      default: return level
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
          <h1 className="text-2xl font-bold">{t('profile.skills')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('profile.showcaseSkills')}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="gap-2 w-full sm:w-auto whitespace-nowrap"
          disabled={showForm}
        >
          <Plus className="h-4 w-4" />
          {t('profile.addSkill')}
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
                <Label htmlFor="skillName">{t('profile.skillName')}</Label>
                <Input
                  id="skillName"
                  value={formData.skillName}
                  onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                  placeholder="e.g., React, Python, Leadership"
                  required
                />
              </div>
              <div>
                <Label htmlFor="skillLevel">{t('profile.skillLevel')}</Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(value: string) => {
                    setFormData({ ...formData, skillLevel: value as "Beginner" | "Intermediate" | "Advanced" | "Expert" })
                  }}
                >
                  <option value="Beginner">{t('profile.beginner')}</option>
                  <option value="Intermediate">{t('profile.intermediate')}</option>
                  <option value="Advanced">{t('profile.advanced')}</option>
                  <option value="Expert">{t('profile.expert')}</option>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t('common.loading') : editingSkill ? t('profile.updateSkill') : t('profile.addSkill')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Verified Skills Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Verified Skills ({skills.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            These skills have been verified through exams
          </p>
        </div>

        {skills.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Verified Skills</h3>
              <p className="text-sm text-muted-foreground">
                Add a skill and verify it to see it here
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <Card key={skill.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{skill.skill_name}</h3>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(skill.skill_level)}`}>
                      {translateSkillLevel(skill.skill_level)}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(skill)}
                      aria-label="Edit skill"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(skill.id)}
                      aria-label="Delete skill"
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

      {/* Unverified Skills Section */}
      {unverifiedSkills.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Unverified Skills ({unverifiedSkills.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Verify these skills by taking a 10-mark exam
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unverifiedSkills.map((skill) => (
              <Card key={skill.id} className="p-4 border-orange-200 bg-orange-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{skill.skill_name}</h3>
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${getSkillLevelColor(skill.skill_level)}`}>
                      {translateSkillLevel(skill.skill_level)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleStartExam(skill.id)}
                      disabled={loadingExam}
                      className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white shadow-md"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {loadingExam ? "Loading..." : "Take Exam"}
                    </Button>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(skill)}
                      aria-label="Edit skill"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(skill.id)}
                      aria-label="Delete skill"
                      className="h-9 w-9 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - No skills at all */}
      {skills.length === 0 && unverifiedSkills.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t('profile.noSkillsAdded')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('profile.addFirstSkill')}
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {t('profile.addYourFirstSkill')}
            </Button>
          </div>
        </Card>
      )}

      {/* Exam Modal */}
      {showExam && currentExam && (
        <SkillExam
          exam={currentExam}
          onClose={() => {
            setShowExam(false)
            setCurrentExam(null)
            refreshAll() // Refresh skills after exam
          }}
          onSubmit={handleSubmitExam}
        />
      )}
    </div>
  )
}
