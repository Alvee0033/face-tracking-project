"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { Plus, Edit, Trash2, Calendar, ExternalLink, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
// Layout provides navbar and sidebar

interface Project {
  id: string
  project_title: string
  project_type: "Academic Project" | "Personal Project" | "Hackathon" | "Open Source" | "Freelance"
  organization: string | null
  start_date: string
  end_date: string | null
  is_ongoing: boolean
  description: string
  project_url: string | null
  technologies_used: string[]
  created_at: string
  updated_at: string
}

export default function ProjectsManagementPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    projectTitle: "",
    projectType: "Personal Project" as "Academic Project" | "Personal Project" | "Hackathon" | "Open Source" | "Freelance",
    organization: "",
    startDate: "",
    endDate: "",
    isOngoing: false,
    description: "",
    projectUrl: "",
    technologiesUsed: ""
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
    if (fullProfileData?.projects) {
      setProjects(fullProfileData.projects)
    }
  }, [fullProfileData])

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

      if (!formData.description || formData.description.trim() === "") {
        setError((t('jobs.jobDescription') || "Description") + " is required")
        setSaving(false)
        return
      }

      const submitData = {
        projectTitle: formData.projectTitle,
        projectType: formData.projectType,
        organization: formData.organization && formData.organization.trim() !== "" ? formData.organization : null,
        startDate: formatDateForBackend(formData.startDate),
        endDate: formData.isOngoing ? null : formatDateForBackend(formData.endDate),
        isOngoing: formData.isOngoing,
        description: formData.description,
        projectUrl: formData.projectUrl && formData.projectUrl.trim() !== "" ? formData.projectUrl : null,
        technologiesUsed: formData.technologiesUsed && formData.technologiesUsed.trim() !== ""
          ? formData.technologiesUsed.split(',').map(tech => tech.trim()).filter(Boolean)
          : null
      }

      if (editingProject) {
        // Update existing project
        await profileAPI.updateProject(editingProject.id, submitData)
        setProjects(projects.map(proj =>
          proj.id === editingProject.id
            ? { ...proj, ...formData }
            : proj
        ))
        await refetch()
      } else {
        // Add new project
        await profileAPI.addProject(submitData)
        await refetch()
      }

      setFormData({
        projectTitle: "",
        projectType: "Personal Project",
        organization: "",
        startDate: "",
        endDate: "",
        isOngoing: false,
        description: "",
        projectUrl: "",
        technologiesUsed: ""
      })
      setEditingProject(null)
      setShowForm(false)
    } catch (err: any) {
      console.error("Failed to save project:", err)
      setError(err.response?.data?.message || t('profile.failedToSaveProject'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      projectTitle: project.project_title,
      projectType: project.project_type,
      organization: project.organization || "",
      startDate: project.start_date,
      endDate: project.end_date || "",
      isOngoing: project.is_ongoing,
      description: project.description,
      projectUrl: project.project_url || "",
      technologiesUsed: project.technologies_used.join(', ')
    })
    setShowForm(true)
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm(t('profile.deleteProjectConfirm'))) return

    try {
      await profileAPI.deleteProject(projectId)
      setProjects(projects.filter(proj => proj.id !== projectId))
      refetch()
    } catch (err: any) {
      console.error("Failed to delete project:", err)
      setError(err.response?.data?.message || t('profile.failedToDeleteProject'))
    }
  }

  const handleCancel = () => {
    setFormData({
      projectTitle: "",
      projectType: "Personal Project",
      organization: "",
      startDate: "",
      endDate: "",
      isOngoing: false,
      description: "",
      projectUrl: "",
      technologiesUsed: ""
    })
    setEditingProject(null)
    setShowForm(false)
    setError("")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case "Academic Project": return "text-blue-600 bg-blue-50"
      case "Personal Project": return "text-green-600 bg-green-50"
      case "Hackathon": return "text-purple-600 bg-purple-50"
      case "Open Source": return "text-orange-600 bg-orange-50"
      case "Freelance": return "text-pink-600 bg-pink-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const translateProjectType = (type: string) => {
    switch (type) {
      case "Academic Project": return t('profile.academicProject')
      case "Personal Project": return t('profile.personalProject')
      case "Hackathon": return t('profile.hackathon')
      case "Open Source": return t('profile.openSource')
      case "Freelance": return t('profile.freelance')
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
            <h1 className="text-2xl font-bold">{t('profile.projects')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('profile.showcaseProjects')}
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 w-full sm:w-auto whitespace-nowrap"
            disabled={showForm}
          >
            <Plus className="h-4 w-4" />
            {t('profile.addProject')}
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
                  <Label htmlFor="projectTitle">{t('profile.projectTitle')}</Label>
                  <Input
                    id="projectTitle"
                    value={formData.projectTitle}
                    onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                    placeholder="e.g., E-commerce Website"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="projectType">{t('profile.projectType')}</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, projectType: value as "Academic Project" | "Personal Project" | "Hackathon" | "Open Source" | "Freelance" })
                    }
                  >
                    <option value="Personal Project">{t('profile.personalProject')}</option>
                    <option value="Academic Project">{t('profile.academicProject')}</option>
                    <option value="Hackathon">{t('profile.hackathon')}</option>
                    <option value="Open Source">{t('profile.openSource')}</option>
                    <option value="Freelance">{t('profile.freelance')}</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="organization">{t('profile.organization')}</Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="e.g., University, Company, Hackathon Name"
                />
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
                    disabled={formData.isOngoing}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isOngoing"
                  checked={formData.isOngoing}
                  onChange={(e) => setFormData({ ...formData, isOngoing: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isOngoing">{t('profile.projectOngoing')}</Label>
              </div>

              <div>
                <Label htmlFor="description">{t('jobs.jobDescription')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your project, what you built, and what you learned..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="projectUrl">{t('profile.projectUrl')}</Label>
                <Input
                  id="projectUrl"
                  type="url"
                  value={formData.projectUrl}
                  onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                  placeholder="https://github.com/username/project"
                />
              </div>

              <div>
                <Label htmlFor="technologiesUsed">{t('profile.technologiesUsed')}</Label>
                <Input
                  id="technologiesUsed"
                  value={formData.technologiesUsed}
                  onChange={(e) => setFormData({ ...formData, technologiesUsed: e.target.value })}
                  placeholder="React, Node.js, MongoDB (comma separated)"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? t('common.loading') : editingProject ? t('profile.updateProject') : t('profile.addProject')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Projects List */}
        {projects.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('profile.noProjectsAdded')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('profile.addFirstProject')}
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t('profile.addYourFirstProject')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{project.project_title}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project.project_type)}`}>
                        {translateProjectType(project.project_type)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      {project.organization && (
                        <div className="flex items-center gap-1">
                          <Code className="h-3 w-3" />
                          {project.organization}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.start_date)} - {project.is_ongoing ? t('profile.present') : formatDate(project.end_date || "")}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{project.description}</p>

                    {project.technologies_used && project.technologies_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.technologies_used.map((tech, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('profile.viewProject')}
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(project)}
                      aria-label="Edit project"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(project.id)}
                      aria-label="Delete project"
                      className="h-9 w-9 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-red-50"
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
