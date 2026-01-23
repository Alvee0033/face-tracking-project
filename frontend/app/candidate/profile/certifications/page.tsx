"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOptimizedData } from "@/lib/hooks/use-optimized-data"
import { Plus, Edit, Trash2, Calendar, Award, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { profileAPI } from "@/lib/api"
import { useLanguage } from "@/components/language-provider"
// Layout provides navbar and sidebar

interface Certification {
  id: string
  certification_name: string
  issuing_organization: string
  issue_date: string
  expiry_date: string | null
  does_not_expire: boolean
  credential_id: string | null
  credential_url: string | null
  created_at: string
  updated_at: string
}

export default function CertificationsManagementPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    certificationName: "",
    issuingOrganization: "",
    issueDate: "",
    expiryDate: "",
    doesNotExpire: false,
    credentialId: "",
    credentialUrl: ""
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
    if (fullProfileData?.certifications) {
      setCertifications(fullProfileData.certifications)
      setLoading(false) // Set loading to false once data is fetched
    } else if (!profileLoading) {
      // If profileLoading is false and no certifications, it means an error occurred or no data
      // In a real app, you might want to handle errors from useOptimizedData more explicitly
      setLoading(false)
    }
  }, [fullProfileData, profileLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const submitData = {
        ...formData,
        expiryDate: formData.doesNotExpire ? null : formData.expiryDate || null
      }

      if (editingCertification) {
        // Update existing certification
        await profileAPI.updateCertification(editingCertification.id, submitData)
        setCertifications(certifications.map(cert =>
          cert.id === editingCertification.id
            ? { ...cert, ...submitData }
            : cert
        ))
        await refetch()
      } else {
        // Add new certification
        await profileAPI.addCertification(submitData)
        await refetch()
      }

      setFormData({
        certificationName: "",
        issuingOrganization: "",
        issueDate: "",
        expiryDate: "",
        doesNotExpire: false,
        credentialId: "",
        credentialUrl: ""
      })
      setEditingCertification(null)
      setShowForm(false)
    } catch (err: any) {
      console.error("Failed to save certification:", err)
      setError(err.response?.data?.message || t('profile.failedToSaveCertification'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (certification: Certification) => {
    setEditingCertification(certification)
    setFormData({
      certificationName: certification.certification_name,
      issuingOrganization: certification.issuing_organization,
      issueDate: certification.issue_date,
      expiryDate: certification.expiry_date || "",
      doesNotExpire: certification.does_not_expire,
      credentialId: certification.credential_id || "",
      credentialUrl: certification.credential_url || ""
    })
    setShowForm(true)
  }

  const handleDelete = async (certificationId: string) => {
    if (!confirm(t('profile.deleteCertificationConfirm'))) return

    try {
      await profileAPI.deleteCertification(certificationId)
      setCertifications(certifications.filter(cert => cert.id !== certificationId))
      refetch()
    } catch (err: any) {
      console.error("Failed to delete certification:", err)
      setError(err.response?.data?.message || t('profile.failedToDeleteCertification'))
    }
  }

  const handleCancel = () => {
    setFormData({
      certificationName: "",
      issuingOrganization: "",
      issueDate: "",
      expiryDate: "",
      doesNotExpire: false,
      credentialId: "",
      credentialUrl: ""
    })
    setEditingCertification(null)
    setShowForm(false)
    setError("")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
    return new Date(expiryDate) <= threeMonthsFromNow && new Date(expiryDate) > new Date()
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
            <h1 className="text-2xl font-bold">{t('profile.certifications')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('profile.addCertifications')}
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 w-full sm:w-auto whitespace-nowrap"
            disabled={showForm}
          >
            <Plus className="h-4 w-4" />
            {t('profile.addCertification')}
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
                  <Label htmlFor="certificationName">{t('profile.certificationName')}</Label>
                  <Input
                    id="certificationName"
                    value={formData.certificationName}
                    onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })}
                    placeholder="e.g., AWS Certified Developer"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="issuingOrganization">{t('profile.issuingOrganization')}</Label>
                  <Input
                    id="issuingOrganization"
                    value={formData.issuingOrganization}
                    onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })}
                    placeholder="e.g., Amazon Web Services"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">{t('profile.issueDate')}</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">{t('profile.expiryDate')}</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    disabled={formData.doesNotExpire}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="doesNotExpire"
                  checked={formData.doesNotExpire}
                  onChange={(e) => setFormData({ ...formData, doesNotExpire: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="doesNotExpire">{t('profile.doesNotExpire')}</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credentialId">{t('profile.credentialId')}</Label>
                  <Input
                    id="credentialId"
                    value={formData.credentialId}
                    onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                    placeholder="e.g., ABC123XYZ"
                  />
                </div>
                <div>
                  <Label htmlFor="credentialUrl">{t('profile.credentialUrl')}</Label>
                  <Input
                    id="credentialUrl"
                    type="url"
                    value={formData.credentialUrl}
                    onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
                    placeholder="https://aws.amazon.com/verify/ABC123XYZ"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? t('common.loading') : editingCertification ? t('profile.updateCertification') : t('profile.addCertification')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Certifications List */}
        {certifications.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('profile.noCertificationsAdded')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('profile.addFirstCertification')}
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t('profile.addYourFirstCertification')}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {certifications.map((certification) => (
              <Card key={certification.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{certification.certification_name}</h3>
                      {certification.expiry_date && isExpired(certification.expiry_date) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">
                          {t('profile.expired')}
                        </span>
                      )}
                      {certification.expiry_date && isExpiringSoon(certification.expiry_date) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-50">
                          {t('profile.expiresSoon')}
                        </span>
                      )}
                      {certification.does_not_expire && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                          {t('profile.noExpiry')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {certification.issuing_organization}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t('profile.issued')}: {formatDate(certification.issue_date)}
                      </div>
                      {certification.expiry_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t('profile.expires')}: {formatDate(certification.expiry_date)}
                        </div>
                      )}
                    </div>

                    {certification.credential_id && (
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>{t('profile.credentialId').replace(' (Optional)', '')}:</strong> {certification.credential_id}
                      </div>
                    )}

                    {certification.credential_url && (
                      <a
                        href={certification.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('profile.verifyCredential')}
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(certification)}
                      aria-label="Edit certification"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(certification.id)}
                      aria-label="Delete certification"
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
