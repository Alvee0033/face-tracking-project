"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  FileText, Download, Sparkles, RefreshCw, CheckCircle2,
  Briefcase, GraduationCap, Award, Code, Linkedin, Globe,
  Github, ExternalLink, Copy, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cvAPI } from "@/lib/api"
import html2canvas from "html2canvas-pro"
import jsPDF from "jspdf"
import HeadshotGenerator from "@/components/headshot-generator"

interface Profile {
  full_name: string
  email: string
  phone_number?: string
  profile_picture_url?: string
  headline?: string
  bio?: string
  years_of_experience?: string
  current_job_title?: string
  current_company?: string
  country: string
  city: string
  linkedin_url?: string
  github_url?: string
  portfolio_website?: string
  behance_url?: string
}

interface Skill {
  skill_name: string
  skill_level: string
}

interface Experience {
  id: string
  job_title: string
  company: string
  location?: string
  start_date: string
  end_date?: string
  is_current: boolean
  description?: string
  enhancedBulletPoints?: string[]
}

interface Project {
  id: string
  project_title: string
  project_type: string
  organization?: string
  start_date: string
  end_date?: string
  is_ongoing: boolean
  description: string
  project_url?: string
  technologies_used?: string[]
  enhancedBulletPoints?: string[]
}

interface Education {
  id: string
  degree: string
  field_of_study: string
  institution: string
  start_date: string
  end_date?: string
  is_current: boolean
  grade?: string
  achievements?: string
}

interface Certification {
  id: string
  certification_name: string
  issuing_organization: string
  issue_date: string
  expiry_date?: string
  credential_id?: string
}

interface Recommendations {
  linkedin: {
    headline: string
    summary: string
    improvements: string[]
  }
  portfolio: {
    recommendations: string[]
    missingElements: string[]
  }
  general: {
    strengths: string[]
    weaknesses: string[]
    actionItems: string[]
  }
}

export default function CVBuilderPage() {
  const router = useRouter()
  const cvRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])

  const [professionalSummary, setProfessionalSummary] = useState<string>("")
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [enhancedExperience, setEnhancedExperience] = useState<Experience[]>([])
  const [enhancedProjects, setEnhancedProjects] = useState<Project[]>([])
  const [enhancing, setEnhancing] = useState(false)

  const [copiedText, setCopiedText] = useState<string>("")

  // Helper to generate a hash of profile data for cache invalidation
  const getProfileHash = () => {
    const data = JSON.stringify({ profile, skills, experience, projects, education, certifications })
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString()
  }

  // Load cached AI content if profile hasn't changed
  useEffect(() => {
    if (!profile) return

    const currentHash = getProfileHash()
    const cachedHash = localStorage.getItem('cv_profile_hash')

    if (currentHash === cachedHash) {
      // Profile hasn't changed, load cached content
      const cachedSummary = localStorage.getItem('cv_cached_summary')
      const cachedRecommendations = localStorage.getItem('cv_cached_recommendations')
      const cachedEnhancedExp = localStorage.getItem('cv_cached_enhanced_experience')
      const cachedEnhancedProj = localStorage.getItem('cv_cached_enhanced_projects')

      if (cachedSummary) setProfessionalSummary(cachedSummary)
      if (cachedRecommendations) setRecommendations(JSON.parse(cachedRecommendations))
      if (cachedEnhancedExp) setEnhancedExperience(JSON.parse(cachedEnhancedExp))
      if (cachedEnhancedProj) setEnhancedProjects(JSON.parse(cachedEnhancedProj))
    } else {
      // Profile changed, clear old cache
      localStorage.removeItem('cv_cached_summary')
      localStorage.removeItem('cv_cached_recommendations')
      localStorage.removeItem('cv_cached_enhanced_experience')
      localStorage.removeItem('cv_cached_enhanced_projects')
      setProfessionalSummary("")
      setRecommendations(null)
      setEnhancedExperience([])
      setEnhancedProjects([])
    }
  }, [profile, skills, experience, projects, education, certifications])

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const response = await cvAPI.getProfile()
      const data = response.data

      setProfile(data.profile)
      setSkills(data.skills || [])
      setExperience(data.experience || [])
      setProjects(data.projects || [])
      setEducation(data.education || [])
      setCertifications(data.certifications || [])
    } catch (error: any) {
      console.error("Failed to fetch profile:", error)
      alert(error.response?.data?.message || "Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    // Check if already cached
    if (professionalSummary) {
      const regenerate = confirm("You already have a generated summary. Generate a new one?")
      if (!regenerate) return
    }

    try {
      setSummaryLoading(true)
      const response = await cvAPI.generateSummary()
      const newSummary = response.data.summary
      setProfessionalSummary(newSummary)

      // Cache the result
      localStorage.setItem('cv_cached_summary', newSummary)
      localStorage.setItem('cv_profile_hash', getProfileHash())

      alert("Professional summary generated!")
    } catch (error: any) {
      console.error("Failed to generate summary:", error)
      alert(error.response?.data?.message || "Failed to generate summary")
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleEnhanceBullets = async (type: 'experience' | 'projects') => {
    // Check if already cached
    const alreadyEnhanced = type === 'experience' ? enhancedExperience.length > 0 : enhancedProjects.length > 0
    if (alreadyEnhanced) {
      const regenerate = confirm(`You already have enhanced ${type}. Regenerate?`)
      if (!regenerate) return
    }

    try {
      setEnhancing(true)
      const response = await cvAPI.enhanceBullets(type)

      if (type === 'experience') {
        const enhanced = response.data.items
        setEnhancedExperience(enhanced)
        // Cache the result
        localStorage.setItem('cv_cached_enhanced_experience', JSON.stringify(enhanced))
        localStorage.setItem('cv_profile_hash', getProfileHash())
        alert("Experience bullet points enhanced!")
      } else {
        const enhanced = response.data.items
        setEnhancedProjects(enhanced)
        // Cache the result
        localStorage.setItem('cv_cached_enhanced_projects', JSON.stringify(enhanced))
        localStorage.setItem('cv_profile_hash', getProfileHash())
        alert("Project bullet points enhanced!")
      }
    } catch (error: any) {
      console.error("Failed to enhance bullets:", error)
      alert(error.response?.data?.message || "Failed to enhance bullet points")
    } finally {
      setEnhancing(false)
    }
  }

  const handleGenerateRecommendations = async () => {
    // Check if already cached
    if (recommendations) {
      const regenerate = confirm("You already have generated recommendations. Generate new ones?")
      if (!regenerate) return
    }

    try {
      setRecommendationsLoading(true)
      const response = await cvAPI.generateRecommendations()
      const newRecommendations = response.data.recommendations
      setRecommendations(newRecommendations)

      // Cache the result
      localStorage.setItem('cv_cached_recommendations', JSON.stringify(newRecommendations))
      localStorage.setItem('cv_profile_hash', getProfileHash())

      alert("Recommendations generated!")
    } catch (error: any) {
      console.error("Failed to generate recommendations:", error)
      alert(error.response?.data?.message || "Failed to generate recommendations")
    } finally {
      setRecommendationsLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!cvRef.current) return

    try {
      // Show loading state
      const downloadBtn = document.querySelector('[data-download-btn]') as HTMLElement
      const originalText = downloadBtn?.textContent
      if (downloadBtn) {
        downloadBtn.textContent = 'Generating PDF...'
        downloadBtn.setAttribute('disabled', 'true')
      }

      // Clone the CV content directly
      const clonedContent = cvRef.current.cloneNode(true) as HTMLElement

      // Create a temporary container styled exactly like the web version
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '210mm' // A4 width
      tempContainer.style.backgroundColor = '#ffffff'
      tempContainer.style.fontFamily = "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
      tempContainer.style.fontSize = '16px'

      // Apply all necessary styles to cloned content
      clonedContent.style.width = '210mm'
      clonedContent.style.maxWidth = '210mm'
      clonedContent.style.margin = '0'
      clonedContent.style.backgroundColor = '#ffffff'
      clonedContent.style.boxShadow = 'none'
      clonedContent.style.border = 'none'
      clonedContent.style.borderRadius = '0'

      // Ensure all styles are preserved - getComputedStyle already converts oklab to RGB!
      const allElements = clonedContent.querySelectorAll('*')
      allElements.forEach((el: any) => {
        if (el instanceof HTMLElement) {
          // Get computed styles - browser automatically converts oklab to RGB
          const computedStyle = window.getComputedStyle(el)

          // Helper to safely get RGB color from computed style
          const getRgbColor = (colorValue: string): string => {
            if (!colorValue || colorValue === 'none' || colorValue === 'transparent' || colorValue === 'rgba(0, 0, 0, 0)') {
              return ''
            }
            // Computed styles are already in RGB format, but check if it's a valid color
            if (colorValue.startsWith('rgb') || colorValue.startsWith('#')) {
              return colorValue
            }
            // Try to convert using canvas (handles any color format)
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 1
              canvas.height = 1
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.fillStyle = colorValue
                const converted = ctx.fillStyle
                // Only return if it's a valid RGB color
                if (converted && (converted.startsWith('rgb') || converted.startsWith('#'))) {
                  return converted
                }
              }
            } catch (e) {
              // Ignore conversion errors
            }
            return ''
          }

          // Apply computed styles directly (already converted to RGB by browser)
          const bgColor = computedStyle.backgroundColor
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgbColor = getRgbColor(bgColor)
            if (rgbColor) {
              el.style.backgroundColor = rgbColor
            }
          }

          const textColor = computedStyle.color
          if (textColor) {
            const rgbColor = getRgbColor(textColor)
            if (rgbColor) {
              el.style.color = rgbColor
            }
          }

          // Handle background images (gradients)
          const bgImage = computedStyle.backgroundImage
          if (bgImage && bgImage !== 'none') {
            // For gradients, we need to check if html2canvas can handle them
            // If the gradient contains oklab in the original CSS, computed style might still have it
            // So we'll let html2canvas handle it, but provide a fallback
            el.style.backgroundImage = bgImage
          }

          // Preserve borders
          const borderColor = computedStyle.borderColor
          if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
            const rgbColor = getRgbColor(borderColor)
            if (rgbColor) {
              el.style.borderColor = rgbColor
            }
          }

          if (computedStyle.borderWidth && computedStyle.borderWidth !== '0px') {
            el.style.borderWidth = computedStyle.borderWidth
            el.style.borderStyle = computedStyle.borderStyle || 'solid'
          }

          if (computedStyle.borderRadius && computedStyle.borderRadius !== '0px') {
            el.style.borderRadius = computedStyle.borderRadius
          }

          // Preserve box shadow (computed style should already be RGB)
          const boxShadow = computedStyle.boxShadow
          if (boxShadow && boxShadow !== 'none') {
            el.style.boxShadow = boxShadow
          }

          // Preserve spacing
          if (computedStyle.padding) {
            el.style.padding = computedStyle.padding
          }
          if (computedStyle.margin) {
            el.style.margin = computedStyle.margin
          }

          // Preserve font styles
          if (computedStyle.fontWeight) {
            el.style.fontWeight = computedStyle.fontWeight
          }
          if (computedStyle.fontSize) {
            el.style.fontSize = computedStyle.fontSize
          }
          if (computedStyle.fontFamily) {
            el.style.fontFamily = computedStyle.fontFamily
          }

          // Ensure proper page breaks for PDF
          el.style.pageBreakInside = 'avoid'
          el.style.breakInside = 'avoid'
          el.style.pageBreakAfter = 'auto'
          el.style.breakAfter = 'auto'
        }
      })

      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)

      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100))

      // Generate high-quality canvas with error handling
      const canvas = await html2canvas(tempContainer, {
        scale: 3, // High quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
        windowWidth: tempContainer.scrollWidth,
        windowHeight: tempContainer.scrollHeight,
        ignoreElements: (element) => {
          // Ignore elements that might have problematic colors
          return false
        },
        onclone: (clonedDoc) => {
          // Final pass: ensure all colors are in RGB format
          // Use computed styles which browser already converted from oklab to RGB
          const allClonedElements = clonedDoc.querySelectorAll('*')
          allClonedElements.forEach((clonedEl: any) => {
            if (clonedEl instanceof HTMLElement) {
              try {
                const inlineStyle = clonedEl.style
                const computedStyle = window.getComputedStyle(clonedEl)

                // Helper to convert any color to RGB using canvas
                const toRgb = (colorValue: string): string => {
                  if (!colorValue || colorValue === 'none' || colorValue === 'transparent') {
                    return ''
                  }
                  // If already RGB, return as is
                  if (colorValue.startsWith('rgb') || colorValue.startsWith('#')) {
                    return colorValue
                  }
                  // Try canvas conversion
                  try {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.fillStyle = colorValue
                      const converted = ctx.fillStyle
                      if (converted && (converted.startsWith('rgb') || converted.startsWith('#'))) {
                        return converted
                      }
                    }
                  } catch (e) {
                    // Ignore
                  }
                  return ''
                }

                // Ensure backgroundColor is RGB - preserve inline hex/rgb colors
                if (inlineStyle.backgroundColor) {
                  // If it's already a hex color or rgb, keep it (don't override)
                  if (inlineStyle.backgroundColor.startsWith('#') || inlineStyle.backgroundColor.startsWith('rgb')) {
                    // Keep the inline style as is - it's already in correct format
                  } else {
                    const rgb = toRgb(inlineStyle.backgroundColor)
                    if (rgb) {
                      inlineStyle.backgroundColor = rgb
                    } else if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                      inlineStyle.backgroundColor = computedStyle.backgroundColor
                    }
                  }
                } else if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && computedStyle.backgroundColor !== 'transparent') {
                  // Apply computed style if no inline style exists
                  inlineStyle.backgroundColor = computedStyle.backgroundColor
                }

                // Also check the 'background' property
                if (inlineStyle.background && !inlineStyle.backgroundColor) {
                  // If background property exists but backgroundColor doesn't, try to extract it
                  if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    inlineStyle.backgroundColor = computedStyle.backgroundColor
                  }
                }

                // Ensure color is RGB
                if (inlineStyle.color) {
                  const rgb = toRgb(inlineStyle.color)
                  if (rgb) {
                    inlineStyle.color = rgb
                  } else if (computedStyle.color) {
                    inlineStyle.color = computedStyle.color
                  }
                }

                // Ensure borderColor is RGB
                if (inlineStyle.borderColor) {
                  const rgb = toRgb(inlineStyle.borderColor)
                  if (rgb) {
                    inlineStyle.borderColor = rgb
                  } else if (computedStyle.borderColor && computedStyle.borderColor !== 'rgba(0, 0, 0, 0)') {
                    inlineStyle.borderColor = computedStyle.borderColor
                  }
                }

                // Handle backgroundImage - if it contains oklab, remove it
                if (inlineStyle.backgroundImage && inlineStyle.backgroundImage.includes('oklab')) {
                  // Use computed backgroundColor as fallback
                  if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    inlineStyle.backgroundImage = 'none'
                    inlineStyle.backgroundColor = computedStyle.backgroundColor
                  }
                }
              } catch (e) {
                // Silently ignore any errors
              }
            }
          })
        }
      }).catch(async (error) => {
        console.warn('High quality render failed, trying with lower quality:', error)
        // Fallback: try with lower quality settings
        return await html2canvas(tempContainer, {
          scale: 2,
          useCORS: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (element) => false
        })
      })
      // Remove temporary container
      document.body.removeChild(tempContainer)

      // Create PDF with proper dimensions and pagination
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      })

      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 0 // No margin for full-page rendering

      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        0,
        position,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      )

      heightLeft -= pageHeight

      // Add additional pages if content spans multiple pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          0,
          position,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        )
        heightLeft -= pageHeight
      }

      // Download PDF
      const fileName = `${profile?.full_name?.replace(/\s+/g, '_') || 'Professional'}_CV.pdf`
      pdf.save(fileName)

      // Reset button
      if (downloadBtn) {
        downloadBtn.textContent = originalText || 'Export PDF'
        downloadBtn.removeAttribute('disabled')
      }

      alert("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(type)
    alert("Copied to clipboard!")
    setTimeout(() => setCopiedText(""), 2000)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const getDisplayExperience = () => {
    return enhancedExperience.length > 0 ? enhancedExperience : experience
  }

  const getDisplayProjects = () => {
    return enhancedProjects.length > 0 ? enhancedProjects : projects
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#633ff3] mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading profile data...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
            <p className="text-sm text-gray-600 mb-6">
              Please complete your profile first
            </p>
            <Button
              onClick={() => router.push('/candidate/profile/edit')}
              className="bg-[#633ff3] hover:bg-[#5330d4] text-white"
            >
              Go to Profile
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">

      {/* PDF-specific styles */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        
        /* Ensure gradients render in PDF */
        .pdf-gradient-header {
          background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%) !important;
        }
        
        .pdf-preserve-colors * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                CV Builder
              </h1>
              <p className="text-base text-gray-600">
                Generate and export your professional CV with AI assistance
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                data-download-btn
                className="border-2 border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold shadow-sm hover:shadow-md transition-all"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/candidate/profile/edit')}
                className="border-2 border-cyan-600 text-cyan-700 hover:bg-cyan-50 font-semibold shadow-sm hover:shadow-md transition-all"
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Suggestions Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 shadow-lg hover:shadow-xl transition-shadow">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-teal-800">
                <Sparkles className="h-5 w-5 mr-2 text-teal-600" />
                AI Assistant
              </h2>

              <div className="space-y-4">
                {/* Professional Summary */}
                <div>
                  <h3 className="font-medium mb-2 text-teal-700">Professional Summary</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                    className="w-full border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all"
                  >
                    {summaryLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                  {professionalSummary && (
                    <div className="mt-3 p-4 bg-white border-2 border-teal-200 rounded-lg shadow-sm">
                      <p className="text-sm text-gray-800 leading-relaxed">{professionalSummary}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-6"
                        onClick={() => copyToClipboard(professionalSummary, 'summary')}
                      >
                        {copiedText === 'summary' ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>
                  )}
                </div>

                {/* Enhance Bullets */}
                <div>
                  <h3 className="font-medium mb-2 text-teal-700">Enhance Bullet Points</h3>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnhanceBullets('experience')}
                      disabled={enhancing || experience.length === 0}
                      className="w-full border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all"
                    >
                      {enhancing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Enhance Experience
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnhanceBullets('projects')}
                      disabled={enhancing || projects.length === 0}
                      className="w-full border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all"
                    >
                      {enhancing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Code className="h-4 w-4 mr-2" />
                          Enhance Projects
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="font-medium mb-2 text-teal-700">Recommendations</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateRecommendations}
                    disabled={recommendationsLoading}
                    className="w-full border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all"
                  >
                    {recommendationsLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get Recommendations
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Recommendations Display */}
            {recommendations && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                <div className="space-y-4 text-sm">
                  {recommendations.linkedin && (
                    <div>
                      <h3 className="font-medium mb-2 flex items-center">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="font-medium text-xs text-gray-600">Recommended Headline:</p>
                          <p className="text-gray-700">{recommendations.linkedin.headline}</p>
                        </div>
                        <div>
                          <p className="font-medium text-xs text-gray-600">Recommended Summary:</p>
                          <p className="text-gray-700">{recommendations.linkedin.summary}</p>
                        </div>
                        {recommendations.linkedin.improvements.length > 0 && (
                          <div>
                            <p className="font-medium text-xs text-gray-600">Improvements:</p>
                            <ul className="list-disc list-inside text-gray-700">
                              {recommendations.linkedin.improvements.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {recommendations.portfolio && (
                    <div>
                      <h3 className="font-medium mb-2 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Portfolio
                      </h3>
                      <div className="space-y-2">
                        {recommendations.portfolio.recommendations.length > 0 && (
                          <div>
                            <p className="font-medium text-xs text-gray-600">Recommendations:</p>
                            <ul className="list-disc list-inside text-gray-700">
                              {recommendations.portfolio.recommendations.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {recommendations.portfolio.missingElements.length > 0 && (
                          <div>
                            <p className="font-medium text-xs text-gray-600">Missing Elements:</p>
                            <ul className="list-disc list-inside text-gray-700">
                              {recommendations.portfolio.missingElements.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {recommendations.general && (
                    <div>
                      <h3 className="font-medium mb-2">General</h3>
                      <div className="space-y-2">
                        {recommendations.general.actionItems.length > 0 && (
                          <div>
                            <p className="font-medium text-xs text-gray-600">Action Items:</p>
                            <ul className="list-disc list-inside text-gray-700">
                              {recommendations.general.actionItems.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* CV Preview */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-xl border-2 border-teal-100">
              {/* CV Content */}
              <div ref={cvRef} className="bg-white pdf-preserve-colors">
                {/* Header Section with Gradient */}
                <div className="pdf-gradient-header bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 text-white p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                      {profile.headline && (
                        <p className="text-lg text-teal-50 mb-3">{profile.headline}</p>
                      )}
                      {profile.current_job_title && (
                        <p className="text-sm text-teal-100 mb-3">
                          {profile.current_job_title}{profile.current_company && ` at ${profile.current_company}`}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-teal-50">
                        {profile.email && (
                          <span className="flex items-center gap-1">
                            {profile.email}
                          </span>
                        )}
                        {profile.phone_number && (
                          <span className="flex items-center gap-1">
                            {profile.phone_number}
                          </span>
                        )}
                        {profile.city && profile.country && (
                          <span className="flex items-center gap-1">
                            {profile.city}, {profile.country}
                          </span>
                        )}
                        {profile.years_of_experience && (
                          <span className="flex items-center gap-1">
                            {profile.years_of_experience} years experience
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-3">
                        {profile.linkedin_url && (
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="text-teal-50 hover:text-white transition-colors">
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                        {profile.github_url && (
                          <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                            className="text-teal-50 hover:text-white transition-colors">
                            <Github className="h-5 w-5" />
                          </a>
                        )}
                        {profile.portfolio_website && (
                          <a href={profile.portfolio_website} target="_blank" rel="noopener noreferrer"
                            className="text-teal-50 hover:text-white transition-colors">
                            <Globe className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Sections */}
                <div className="p-8 space-y-6">

                  {/* Professional Summary */}
                  {(professionalSummary || profile.bio) && (
                    <div className="mb-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Professional Summary</h2>
                      </div>
                      <div className="pl-10">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {professionalSummary || profile.bio}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="mb-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Code className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Technical Skills</h2>
                      </div>
                      <div className="pl-10 flex flex-wrap gap-1.5">
                        {skills.map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 text-gray-800 rounded-full text-xs font-medium">
                            {skill.skill_name}
                            <span className="ml-1.5 text-xs text-purple-600 font-semibold">•</span>
                            <span className="ml-0.5 text-xs text-gray-600">{skill.skill_level}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {getDisplayExperience().length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Professional Experience</h2>
                      </div>
                      <div className="space-y-4">
                        {getDisplayExperience().map((exp, index) => (
                          <div key={exp.id} className="relative pl-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            {/* Timeline dot */}
                            <div className="absolute left-4 top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 border-2 border-white shadow-md"></div>
                            {/* Timeline line */}
                            {index < getDisplayExperience().length - 1 && (
                              <div className="absolute left-[21px] top-4 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-transparent"></div>
                            )}

                            <div className="bg-gradient-to-br from-gray-50 to-white border-l-4 border-blue-500 rounded-r-lg p-3 hover:shadow-lg transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="text-base font-bold text-gray-900">{exp.job_title}</h3>
                                  <p className="text-sm text-blue-600 font-semibold mt-0.5">{exp.company}</p>
                                  {exp.location && (
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                      </svg>
                                      {exp.location}
                                    </p>
                                  )}
                                </div>
                                <div className="ml-3 text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold whitespace-nowrap">
                                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date || '')}
                                  </span>
                                </div>
                              </div>

                              {exp.enhancedBulletPoints && exp.enhancedBulletPoints.length > 0 ? (
                                <ul className="space-y-1 mt-2">
                                  {exp.enhancedBulletPoints.map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed">
                                      <span className="inline-block h-1 w-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : exp.description && (
                                <p className="text-xs text-gray-700 mt-2 leading-relaxed">{exp.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {getDisplayProjects().length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Code className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Featured Projects</h2>
                      </div>
                      <div className="space-y-4">
                        {getDisplayProjects().map((project, index) => (
                          <div key={project.id} className="relative pl-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            {/* Timeline dot */}
                            <div className="absolute left-4 top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-2 border-white shadow-md"></div>
                            {/* Timeline line */}
                            {index < getDisplayProjects().length - 1 && (
                              <div className="absolute left-[21px] top-4 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 to-transparent"></div>
                            )}

                            <div className="bg-gradient-to-br from-orange-50 to-white border-l-4 border-orange-500 rounded-r-lg p-3 hover:shadow-lg transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="text-base font-bold text-gray-900">{project.project_title}</h3>
                                  {project.organization && (
                                    <p className="text-sm text-orange-600 font-semibold mt-0.5">{project.organization}</p>
                                  )}
                                  <p className="text-xs text-gray-600 mt-0.5">{project.project_type}</p>
                                </div>
                                <div className="ml-3 text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold whitespace-nowrap">
                                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {formatDate(project.start_date)} - {project.is_ongoing ? 'Ongoing' : formatDate(project.end_date || '')}
                                  </span>
                                </div>
                              </div>

                              {project.technologies_used && project.technologies_used.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {project.technologies_used.map((tech, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white border border-orange-200 text-gray-700 rounded-md text-xs font-medium">
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {project.enhancedBulletPoints && project.enhancedBulletPoints.length > 0 ? (
                                <ul className="space-y-1 mt-2">
                                  {project.enhancedBulletPoints.map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed">
                                      <span className="inline-block h-1 w-1 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></span>
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-700 mt-2 leading-relaxed">{project.description}</p>
                              )}

                              {project.project_url && (
                                <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-orange-600 hover:text-orange-700 font-semibold hover:underline">
                                  <ExternalLink className="h-3 w-3" />
                                  View Project
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {education.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Education</h2>
                      </div>
                      <div className="space-y-4">
                        {education.map((edu, index) => (
                          <div key={edu.id} className="relative pl-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            {/* Timeline dot */}
                            <div className="absolute left-4 top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 border-2 border-white shadow-md"></div>
                            {/* Timeline line */}
                            {index < education.length - 1 && (
                              <div className="absolute left-[21px] top-4 bottom-0 w-0.5 bg-gradient-to-b from-green-200 to-transparent"></div>
                            )}

                            <div className="bg-gradient-to-br from-green-50 to-white border-l-4 border-green-500 rounded-r-lg p-3 hover:shadow-lg transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h3 className="text-base font-bold text-gray-900">{edu.degree}</h3>
                                  <p className="text-sm text-green-600 font-semibold mt-0.5">{edu.institution}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">{edu.field_of_study}</p>
                                </div>
                                <div className="ml-3 text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">
                                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {formatDate(edu.start_date)} - {edu.is_current ? 'Present' : formatDate(edu.end_date || '')}
                                  </span>
                                </div>
                              </div>

                              {edu.grade && (
                                <div
                                  className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 border border-green-200 rounded-md"
                                  style={{
                                    backgroundColor: '#f0fdf4',
                                    background: '#f0fdf4',
                                    color: '#000000'
                                  }}
                                >
                                  <Award className="h-3 w-3 text-green-600" style={{ color: '#16a34a' }} />
                                  <span className="text-xs font-semibold text-gray-700" style={{ color: '#374151' }}>Grade:</span>
                                  <span className="text-xs text-gray-900" style={{ color: '#111827' }}>{edu.grade}</span>
                                </div>
                              )}

                              {edu.achievements && (
                                <p className="text-xs text-gray-700 mt-2 leading-relaxed">{edu.achievements}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {certifications.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Award className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Certifications & Awards</h2>
                      </div>
                      <div className="space-y-3">
                        {certifications.map((cert) => (
                          <div key={cert.id} className="pl-10" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <div className="bg-gradient-to-br from-yellow-50 to-white border-l-4 border-yellow-500 rounded-r-lg p-3 hover:shadow-lg transition-shadow">
                              <div className="flex items-start gap-2">
                                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Award className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-sm font-bold text-gray-900">{cert.certification_name}</h3>
                                  <p className="text-xs text-yellow-600 font-semibold mt-0.5">{cert.issuing_organization}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                                      Issued: {formatDate(cert.issue_date)}
                                    </span>
                                    {cert.expiry_date && (
                                      <span>Expires: {formatDate(cert.expiry_date)}</span>
                                    )}
                                  </div>
                                  {cert.credential_id && (
                                    <p className="text-xs text-gray-500 mt-1.5 font-mono bg-gray-100 inline-block px-1.5 py-0.5 rounded">
                                      ID: {cert.credential_id}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* AI Headshot Generator Section */}
        <div className="mt-8">
          <HeadshotGenerator />
        </div>
      </main>
    </div>
  )
}
