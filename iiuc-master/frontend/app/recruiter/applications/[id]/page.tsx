"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { applicationsAPI } from "@/lib/api"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import {
  MapPin,
  Briefcase,
  Calendar,
  GraduationCap,
  Award,
  Star,
  FileText,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Loader2,
  ArrowLeft
} from "lucide-react"

interface Application {
  id: string
  job_id: string
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
  cover_letter?: string
  resume_url?: string
  applied_at: string
  jobs: {
    id: string
    job_title: string
    recruiter_id: string
  }
  candidate_profiles: {
    id: string
    headline?: string
    bio?: string
    current_job_title?: string
    current_company?: string
    years_of_experience?: string
    country?: string
    city?: string
    portfolio_website?: string
    linkedin_url?: string
    github_url?: string
    behance_url?: string
    profiles: {
      full_name: string
      email: string
      phone_number?: string
      profile_picture_url?: string
    }
  }
  candidate_details: {
    skills: Array<{
      id: string
      skill_name: string
      skill_level: string
    }>
    experience: Array<{
      id: string
      job_title: string
      company: string
      location?: string
      start_date: string
      end_date?: string
      is_current: boolean
      description?: string
    }>
    education: Array<{
      id: string
      degree: string
      field_of_study: string
      institution: string
      start_date: string
      end_date?: string
      is_current: boolean
      grade?: string
    }>
    certifications: Array<{
      id: string
      certification_name: string
      issuing_organization: string
      issue_date: string
      expiry_date?: string
      does_not_expire: boolean
      credential_url?: string
    }>
  }
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    loadApplication()
  }, [params.id])

  const loadApplication = async () => {
    try {
      const response = await applicationsAPI.getApplicationById(params.id as string)
      setApplication(response.data.application)
    } catch (err: any) {
      console.error("Error loading application:", err)
      setError(err.response?.data?.message || "Failed to load application")
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (newStatus: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired') => {
    if (!application) return

    setUpdatingStatus(true)
    try {
      await applicationsAPI.updateApplicationStatus(application.id, newStatus)
      setApplication({
        ...application,
        status: newStatus
      })
    } catch (err) {
      console.error("Error updating application status:", err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDF4]">
        <RecruiterNavbar />
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <RecruiterSidebar />
            <div className="lg:col-span-10 flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-teal-800 font-medium animate-pulse">Loading application details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden">
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
        </div>

        <RecruiterNavbar />
        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <RecruiterSidebar />
            <div className="lg:col-span-10">
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-12 text-center shadow-lg shadow-teal-900/5">
                <p className="text-red-600 mb-6 text-lg font-medium">{error || "Application not found"}</p>
                <Button
                  onClick={() => router.push(`/recruiter/jobs/${application?.job_id || ''}`)}
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 rounded-xl px-8 py-6 text-lg"
                >
                  Back to Job
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const candidate = application.candidate_profiles
  const candidateDetails = application.candidate_details

  return (
    <div className="min-h-screen bg-[#F0FDF4] relative selection:bg-teal-200 selection:text-teal-900 font-inter overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <RecruiterNavbar />

      <div className="container mx-auto px-6 py-8 relative z-10 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Navigation */}
          <RecruiterSidebar />

          {/* Main Content */}
          <div className="lg:col-span-10">
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/recruiter/jobs/${application.job_id}`)}
                  className="p-2 h-10 w-10 rounded-full bg-white hover:bg-teal-50 text-slate-500 hover:text-teal-600 shadow-sm border border-slate-200 transition-all hover:-translate-x-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <span className="text-slate-500 font-medium">Back to Job</span>
              </div>

              {/* Application Header */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                      {candidate.profiles.profile_picture_url ? (
                        <img
                          src={candidate.profiles.profile_picture_url}
                          alt={candidate.profiles.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-teal-600">
                          {candidate.profiles.full_name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">{candidate.profiles.full_name}</h1>
                      <p className="text-slate-600 font-medium">
                        {candidate.headline || candidate.current_job_title || "Candidate"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Applied for <Link href={`/recruiter/jobs/${application.job_id}`} className="text-teal-600 hover:text-teal-700 hover:underline transition-colors font-bold">{application.jobs.job_title}</Link>
                    </p>
                    <div className="inline-flex items-center text-xs text-slate-400 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100/50">
                      <Calendar className="h-3 w-3 mr-1.5" />
                      {new Date(application.applied_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Application Status */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">Application Status</div>
                  <div className="flex-1">
                    <div className="relative max-w-xs">
                      <select
                        value={application.status}
                        onChange={(e) => updateApplicationStatus(e.target.value as any)}
                        disabled={updatingStatus}
                        className="appearance-none w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer shadow-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-3 pt-6">
                  {candidate.profiles.email && (
                    <a
                      href={`mailto:${candidate.profiles.email}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all text-slate-600 shadow-sm"
                    >
                      <Mail className="h-4 w-4" />
                      {candidate.profiles.email}
                    </a>
                  )}

                  {candidate.profiles.phone_number && (
                    <a
                      href={`tel:${candidate.profiles.phone_number}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all text-slate-600 shadow-sm"
                    >
                      <Phone className="h-4 w-4" />
                      {candidate.profiles.phone_number}
                    </a>
                  )}

                  {candidate.portfolio_website && (
                    <a
                      href={candidate.portfolio_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all text-slate-600 shadow-sm"
                    >
                      <Globe className="h-4 w-4" />
                      Portfolio
                    </a>
                  )}

                  {candidate.linkedin_url && (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all text-slate-600 shadow-sm"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}

                  {candidate.github_url && (
                    <a
                      href={candidate.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all text-slate-600 shadow-sm"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {/* Cover Letter */}
                {application.cover_letter && (
                  <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 h-full">
                    <h2 className="font-bold text-slate-900 flex items-center mb-4 gap-2">
                      <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      Cover Letter
                    </h2>
                    <div className="prose prose-slate prose-sm max-w-none text-slate-600">
                      <p className="whitespace-pre-wrap leading-relaxed">{application.cover_letter}</p>
                    </div>
                  </div>
                )}

                {/* Resume */}
                {application.resume_url && (
                  <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 h-full flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 shadow-sm border border-teal-100">
                      <FileText className="h-8 w-8" />
                    </div>
                    <h2 className="font-bold text-slate-900 mb-2">Resume Available</h2>
                    <p className="text-slate-500 mb-6 text-sm">Review the full resume document</p>

                    <a
                      href={application.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 transition-all hover:scale-[1.02] w-full sm:w-auto"
                    >
                      View Resume PDF
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Skills */}
              {candidateDetails.skills.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <h2 className="font-bold text-slate-900 flex items-center mb-6 gap-2">
                    <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                      <Star className="h-5 w-5" />
                    </div>
                    Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {candidateDetails.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-teal-100 px-4 py-2 text-sm bg-teal-50/50 hover:bg-teal-50 transition-colors"
                      >
                        <span className="text-slate-700 font-semibold">{skill.skill_name}</span>
                        <span className="rounded-lg bg-teal-100 px-2 py-0.5 text-xs text-teal-700 font-bold uppercase tracking-wide">
                          {skill.skill_level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {candidateDetails.experience.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <h2 className="font-bold text-slate-900 flex items-center mb-6 gap-2">
                    <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    Experience
                  </h2>
                  <div className="space-y-8 relative before:absolute before:left-[21px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
                    {candidateDetails.experience.map((exp) => (
                      <div key={exp.id} className="relative pl-12 group">
                        <div className="absolute left-0 top-1.5 w-[44px] flex justify-center">
                          <div className="w-3 h-3 rounded-full bg-teal-100 border-2 border-teal-500 z-10 group-hover:scale-125 transition-transform"></div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-slate-900">{exp.job_title}</h3>
                          <div className="flex flex-wrap items-center gap-x-2 text-slate-600 font-medium text-sm">
                            <span className="text-teal-700">{exp.company}</span>
                            {exp.location && <span className="text-slate-300">•</span>}
                            {exp.location && <span>{exp.location}</span>}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 font-semibold uppercase tracking-wider mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : exp.end_date ? formatDate(exp.end_date) : 'Present'}
                          </div>
                          {exp.description && (
                            <p className="text-sm mt-3 whitespace-pre-wrap text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {candidateDetails.education.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                  <h2 className="font-bold text-slate-900 flex items-center mb-6 gap-2">
                    <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    Education
                  </h2>
                  <div className="space-y-8 relative before:absolute before:left-[21px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
                    {candidateDetails.education.map((edu) => (
                      <div key={edu.id} className="relative pl-12 group">
                        <div className="absolute left-0 top-1.5 w-[44px] flex justify-center">
                          <div className="w-3 h-3 rounded-full bg-teal-100 border-2 border-teal-500 z-10 group-hover:scale-125 transition-transform"></div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg text-slate-900">{edu.degree} in {edu.field_of_study}</h3>
                          <div className="text-slate-600 font-medium text-sm">
                            {edu.institution}
                            {edu.grade && <span className="text-teal-600 ml-2 bg-teal-50 px-2 py-0.5 rounded-md text-xs font-bold">GPA: {edu.grade}</span>}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 font-semibold uppercase tracking-wider mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(edu.start_date)} - {edu.is_current ? 'Present' : edu.end_date ? formatDate(edu.end_date) : 'Present'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {candidateDetails.certifications.length > 0 && (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                  <h2 className="font-bold text-slate-900 flex items-center mb-6 gap-2">
                    <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                      <Award className="h-5 w-5" />
                    </div>
                    Certifications
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {candidateDetails.certifications.map((cert) => (
                      <div key={cert.id} className="bg-white/50 border border-slate-100 rounded-2xl p-5 hover:border-teal-100 hover:shadow-md transition-all group">
                        <h3 className="font-bold text-slate-900 leading-tight mb-2 group-hover:text-teal-700 transition-colors">{cert.certification_name}</h3>
                        <p className="text-sm text-slate-600 font-medium mb-3">
                          {cert.issuing_organization}
                        </p>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-slate-400 font-medium border-t border-slate-100/50 pt-3 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Issued: {formatDate(cert.issue_date)}
                          </span>
                          {!cert.does_not_expire && cert.expiry_date && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              Expires: {formatDate(cert.expiry_date)}
                            </span>
                          )}
                          {cert.does_not_expire && (
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              No Expiration
                            </span>
                          )}
                        </div>
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1 mt-3"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Verify Credential
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* About/Bio */}
              {candidate.bio && (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg shadow-teal-900/5 animate-slide-up" style={{ animationDelay: '0.7s' }}>
                  <h2 className="font-bold text-slate-900 mb-4 text-lg">About</h2>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-600">
                    <p className="whitespace-pre-wrap leading-relaxed">{candidate.bio}</p>
                  </div>
                </div>
              )}

              {/* Location */}
              {(candidate.country || candidate.city) && (
                <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-lg shadow-teal-900/5 flex items-center gap-3 animate-slide-up" style={{ animationDelay: '0.8s' }}>
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="text-slate-700 font-medium">
                    {candidate.city && candidate.country
                      ? `${candidate.city}, ${candidate.country}`
                      : candidate.city || candidate.country}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
