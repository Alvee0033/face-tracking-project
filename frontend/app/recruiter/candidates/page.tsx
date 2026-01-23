"use client"

import { useEffect, useState } from "react"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { RecruiterSidebar } from "@/components/recruiter-sidebar"
import { profileAPI } from "@/lib/api"
import { Download } from "lucide-react"

export default function RecruiterCandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await profileAPI.listCandidates()
        setCandidates(res.data.candidates || [])
      } catch (e) {
        console.error("Failed to fetch candidates", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDownloadResume = async (candidateId: string, candidateName: string) => {
    try {
      setDownloading(candidateId)
      const response = await profileAPI.downloadResume(candidateId)

      // Create blob and download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${candidateName.replace(/\s+/g, '_')}_resume.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Download error:', err)
      if (err.response?.status === 404) {
        alert('No resume found for this candidate')
      } else {
        alert('Failed to download resume')
      }
    } finally {
      setDownloading(null)
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

      <div className="container mx-auto px-6 py-8 relative z-10 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <RecruiterSidebar />
          <div className="lg:col-span-10">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Candidates</h1>
              <p className="text-slate-500 font-medium">Browse and manage potential candidates</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                  <p className="text-teal-800 font-medium animate-pulse">Loading candidates...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((c, index) => (
                  <div
                    key={c.id}
                    className="group bg-white/80 backdrop-blur-xl border border-white/60 hover:border-teal-100 rounded-3xl p-6 shadow-lg shadow-teal-900/5 hover:shadow-xl hover:shadow-teal-900/10 transition-all duration-300 hover:scale-[1.02] animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                        <img
                          src={c.profiles?.profile_picture_url || "/vercel.svg"}
                          alt={c.profiles?.full_name || "Candidate"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-lg text-slate-900 leading-tight group-hover:text-teal-700 transition-colors">
                          {c.profiles?.full_name || "Unnamed"}
                        </div>
                        <div className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1">
                          {c.city && c.country ? `${c.city}, ${c.country}` : 'Location n/a'}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-600 font-medium line-clamp-2 h-10 mb-5">
                      {c.headline || "No headline provided"}
                    </div>

                    {/* Download Resume Button */}
                    {c.resume_filename ? (
                      <button
                        onClick={() => handleDownloadResume(c.id, c.profiles?.full_name || 'candidate')}
                        disabled={downloading === c.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed group-hover:translate-y-[-2px]"
                      >
                        {downloading === c.id ? (
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Download size={18} />
                        )}
                        {downloading === c.id ? 'Downloading...' : 'Download Resume'}
                      </button>
                    ) : (
                      <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-semibold cursor-not-allowed border border-slate-200">
                        No Resume
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


