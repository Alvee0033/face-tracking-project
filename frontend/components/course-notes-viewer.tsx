"use client"

import { useRef } from "react"
import { X, Download, FileText, BookOpen, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

interface CourseNotes {
  courseTitle: string
  generatedDate: string
  overview: {
    introduction: string
    courseScope: string
    targetAudience: string
    prerequisites: string[]
  }
  learningObjectives: {
    primaryGoals: string[]
    skillsYouWillGain: string[]
    expectedOutcomes: string
  }
  topics: Array<{
    topicNumber: number
    title: string
    introduction: string
    keyConcepts: Array<{
      concept: string
      definition: string
      importance: string
    }>
    detailedExplanation: string
    practicalExamples: string[]
    bestPractices: string[]
    commonMistakes: string[]
  }>
  keyTakeaways: {
    summary: string
    criticalPoints: string[]
    realWorldApplications: string[]
  }
  additionalResources: {
    recommendedReading: string[]
    practiceProjects: string[]
    nextSteps: string[]
  }
  practiceExercises: Array<{
    exerciseNumber: number
    question: string
    difficulty: string
    hint: string
  }>
}

interface CourseNotesViewerProps {
  notes: CourseNotes
  onClose: () => void
}

export function CourseNotesViewer({ notes, onClose }: CourseNotesViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const isDownloading = useRef(false)

  const handleDownloadPDF = async () => {
    if (isDownloading.current || !contentRef.current) return

    isDownloading.current = true

    try {
      // Show loading state
      const downloadBtn = document.getElementById('download-btn')
      if (downloadBtn) {
        downloadBtn.setAttribute('disabled', 'true')
        const originalHTML = downloadBtn.innerHTML
        downloadBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Generating PDF...'
      }

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15

      // Get all sections
      const sections = contentRef.current.querySelectorAll('.pdf-section')

      for (let i = 0; i < sections.length; i++) {
        if (i > 0) {
          pdf.addPage()
        }

        const section = sections[i] as HTMLElement

        try {
          // Capture section as canvas with better quality
          const canvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200,
            onclone: (clonedDoc) => {
              // Ensure all colors are RGB using computed styles
              const allClonedElements = clonedDoc.querySelectorAll('*')
              allClonedElements.forEach((clonedEl: any) => {
                if (clonedEl instanceof HTMLElement) {
                  try {
                    const inlineStyle = clonedEl.style
                    const computedStyle = window.getComputedStyle(clonedEl)

                    // Helper to convert to RGB
                    const toRgb = (colorValue: string): string => {
                      if (!colorValue || colorValue === 'none' || colorValue === 'transparent') return ''
                      if (colorValue.startsWith('rgb') || colorValue.startsWith('#')) return colorValue
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
                      } catch (e) { }
                      return ''
                    }

                    // Use computed styles (already RGB)
                    if (inlineStyle.backgroundColor) {
                      const rgb = toRgb(inlineStyle.backgroundColor)
                      if (rgb) {
                        inlineStyle.backgroundColor = rgb
                      } else if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        inlineStyle.backgroundColor = computedStyle.backgroundColor
                      }
                    }

                    if (inlineStyle.color) {
                      const rgb = toRgb(inlineStyle.color)
                      if (rgb) {
                        inlineStyle.color = rgb
                      } else if (computedStyle.color) {
                        inlineStyle.color = computedStyle.color
                      }
                    }

                    if (inlineStyle.borderColor) {
                      const rgb = toRgb(inlineStyle.borderColor)
                      if (rgb) {
                        inlineStyle.borderColor = rgb
                      } else if (computedStyle.borderColor && computedStyle.borderColor !== 'rgba(0, 0, 0, 0)') {
                        inlineStyle.borderColor = computedStyle.borderColor
                      }
                    }

                    // Handle backgroundImage with oklab
                    if (inlineStyle.backgroundImage && inlineStyle.backgroundImage.includes('oklab')) {
                      if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        inlineStyle.backgroundImage = 'none'
                        inlineStyle.backgroundColor = computedStyle.backgroundColor
                      }
                    }
                  } catch (e) {
                    // Silently ignore errors
                  }
                }
              })
            }
          })

          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          const imgWidth = pageWidth - (2 * margin)
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          // Scale to fit page if needed
          let finalWidth = imgWidth
          let finalHeight = imgHeight
          const maxHeight = pageHeight - (2 * margin)

          if (imgHeight > maxHeight) {
            finalHeight = maxHeight
            finalWidth = (canvas.width * finalHeight) / canvas.height
          }

          // Center the image
          const xOffset = (pageWidth - finalWidth) / 2
          const yOffset = margin

          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight)
        } catch (err) {
          console.error(`Error processing section ${i}:`, err)
        }
      }

      // Save PDF
      const fileName = `${notes.courseTitle.replace(/[^a-z0-9]/gi, '_')}_Study_Notes.pdf`
      pdf.save(fileName)

      // Reset button
      if (downloadBtn) {
        downloadBtn.removeAttribute('disabled')
        downloadBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download PDF'
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')

      const downloadBtn = document.getElementById('download-btn')
      if (downloadBtn) {
        downloadBtn.removeAttribute('disabled')
        downloadBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download PDF'
      }
    } finally {
      isDownloading.current = false
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <Card className="w-full h-full max-w-6xl overflow-hidden flex flex-col shadow-2xl border-0 bg-white/50 backdrop-blur-xl rounded-3xl">
        {/* Header */}
        <div className="px-8 py-5 border-b border-white/20 flex items-center justify-between bg-white/80 backdrop-blur-md flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/20 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Course Study Notes</h2>
              <p className="text-sm text-gray-500 font-medium">{notes.courseTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              id="download-btn"
              onClick={handleDownloadPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-lg hover:shadow-xl transition-all rounded-full px-6"
              size="default"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-full w-10 h-10 transition-colors"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 sm:p-10 custom-scrollbar">
          <div ref={contentRef} className="max-w-4xl mx-auto space-y-8">

            {/* Cover Page */}
            <div className="pdf-section bg-gradient-to-b from-white to-gray-50/50 rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-16 text-center space-y-8 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400" />
              <div className="inline-block p-6 bg-teal-50 rounded-3xl mb-4">
                <BookOpen className="h-24 w-24 text-teal-600" />
              </div>
              <h1 className="text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">{notes.courseTitle}</h1>
              <div className="space-y-3">
                <p className="text-2xl text-teal-800 font-medium">Professional Study Guide</p>
                <div className="h-1 w-24 bg-teal-200 mx-auto rounded-full" />
                <p className="text-base text-gray-500 uppercase tracking-widest font-semibold">AI-Generated Companion</p>
              </div>
              <div className="pt-8 flex items-center justify-center gap-4">
                <Badge variant="outline" className="text-sm px-4 py-1.5 border-teal-200 text-teal-700 bg-teal-50/50">
                  {new Date(notes.generatedDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Badge>
                <Badge variant="outline" className="text-sm px-4 py-1.5 border-gray-200 text-gray-600 bg-gray-50">
                  {(Array.isArray(notes.topics) ? notes.topics.length : 0) + 5} Modules
                </Badge>
              </div>
            </div>

            {/* Overview */}
            <div className="pdf-section bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 space-y-8 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500" />
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-teal-200 text-5xl mr-4 -ml-2 select-none">01</span>
                Course Overview
              </h2>

              {notes.overview?.introduction && (
                <div className="prose prose-lg text-gray-600 max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Introduction</h3>
                  <p className="leading-relaxed">{notes.overview.introduction}</p>
                </div>
              )}

              {notes.overview?.courseScope && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Scope</h3>
                  <p className="text-gray-700 leading-relaxed">{notes.overview.courseScope}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {notes.overview?.targetAudience && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Audience</h3>
                    <p className="text-gray-700 leading-relaxed text-sm bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                      {notes.overview.targetAudience}
                    </p>
                  </div>
                )}
                {Array.isArray(notes.overview?.prerequisites) && notes.overview.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Prerequisites</h3>
                    <ul className="space-y-2 bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                      {notes.overview.prerequisites.map((prereq, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-purple-500">•</span>
                          {prereq}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Learning Objectives */}
            <div className="pdf-section bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 space-y-8 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-emerald-200 text-5xl mr-4 -ml-2 select-none">02</span>
                Learning Objectives
              </h2>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Goals</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {Array.isArray(notes.learningObjectives?.primaryGoals) && notes.learningObjectives.primaryGoals.map((goal, index) => (
                    <li key={index} className="flex items-start bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-emerald-900 text-sm font-medium">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills You Will Gain</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(notes.learningObjectives?.skillsYouWillGain) && notes.learningObjectives.skillsYouWillGain.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-white border border-gray-200 text-gray-700 px-3 py-1 shadow-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {notes.learningObjectives?.expectedOutcomes && (
                <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Expected Outcomes</h3>
                  <p className="text-gray-700 leading-relaxed italic border-l-4 border-gray-300 pl-4">{notes.learningObjectives.expectedOutcomes}</p>
                </div>
              )}
            </div>

            {/* Topics */}
            {Array.isArray(notes.topics) && notes.topics.map((topic, index) => (
              <div key={index} className="pdf-section bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 space-y-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                <h2 className="text-3xl font-bold text-gray-900 flex items-center border-b border-gray-100 pb-4">
                  <span className="text-blue-100 text-5xl mr-4 -ml-2 select-none">{String(index + 3).padStart(2, '0')}</span>
                  {topic?.title || 'Topic'}
                </h2>

                {topic?.introduction && (
                  <div className="text-gray-600 text-lg leading-relaxed">
                    {topic.introduction}
                  </div>
                )}

                {Array.isArray(topic?.keyConcepts) && topic.keyConcepts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-1 bg-blue-500 rounded-full mr-3"></span>
                      Key Concepts
                    </h3>
                    <div className="grid gap-4">
                      {topic.keyConcepts.map((concept, idx) => (
                        <div key={idx} className="bg-gray-50 hover:bg-white hover:shadow-md transition-all p-5 rounded-xl border border-gray-100">
                          <h4 className="font-bold text-gray-900 mb-2 text-lg">{concept?.concept || 'Concept'}</h4>
                          {concept?.definition && <p className="text-gray-700 mb-3 leading-relaxed">{concept.definition}</p>}
                          {concept?.importance && (
                            <div className="flex items-start bg-blue-50/50 p-3 rounded-lg text-sm">
                              <span className="text-blue-600 font-bold mr-2 text-xs uppercase tracking-wider mt-0.5">Importance</span>
                              <span className="text-blue-900">{concept.importance}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topic?.detailedExplanation && (
                  <div className="prose prose-blue max-w-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">In-Depth Analysis</h3>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-white p-6 rounded-xl border-l-4 border-blue-200">
                      {topic.detailedExplanation}
                    </div>
                  </div>
                )}

                {Array.isArray(topic?.practicalExamples) && topic.practicalExamples.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Practical Examples</h3>
                    <div className="space-y-3">
                      {topic.practicalExamples.map((example, idx) => (
                        <div key={idx} className="bg-sky-50 border border-sky-100 p-4 rounded-lg flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                          </div>
                          <p className="text-sky-900 leading-relaxed">{example}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  {Array.isArray(topic?.bestPractices) && topic.bestPractices.length > 0 && (
                    <div className="bg-green-50/30 p-5 rounded-xl border border-green-100">
                      <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Best Practices
                      </h3>
                      <ul className="space-y-2">
                        {topic.bestPractices.map((practice, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-700">
                            <span className="text-green-500 mr-2 font-bold">✓</span>
                            {practice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(topic?.commonMistakes) && topic.commonMistakes.length > 0 && (
                    <div className="bg-red-50/30 p-5 rounded-xl border border-red-100">
                      <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center">
                        <X className="w-4 h-4 mr-2" />
                        Common Pitfalls
                      </h3>
                      <ul className="space-y-2">
                        {topic.commonMistakes.map((mistake, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-700">
                            <span className="text-red-500 mr-2 font-bold">!</span>
                            {mistake}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Key Takeaways */}
            <div className="pdf-section bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 space-y-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-indigo-100 text-5xl mr-4 -ml-2 select-none">
                  {String(3 + (Array.isArray(notes.topics) ? notes.topics.length : 0)).padStart(2, '0')}
                </span>
                Summary & Key Takeaways
              </h2>

              {notes.keyTakeaways?.summary && (
                <div className="bg-indigo-50 p-6 rounded-xl text-indigo-900 leading-relaxed italic">
                  "{notes.keyTakeaways.summary}"
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Critical Points</h3>
                <div className="grid gap-3">
                  {Array.isArray(notes.keyTakeaways?.criticalPoints) && notes.keyTakeaways.criticalPoints.map((point, index) => (
                    <div key={index} className="flex items-center bg-gray-50 px-4 py-3 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                      <span className="text-gray-800 font-medium">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Real-World Applications</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.isArray(notes.keyTakeaways?.realWorldApplications) && notes.keyTakeaways.realWorldApplications.map((app, index) => (
                    <div key={index} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-indigo-300 transition-colors">
                      <p className="text-sm text-gray-700">{app}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Resources */}
            <div className="pdf-section bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-10 space-y-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400" />
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-orange-100 text-5xl mr-4 -ml-2 select-none">
                  {String(4 + (Array.isArray(notes.topics) ? notes.topics.length : 0)).padStart(2, '0')}
                </span>
                Next Steps
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {Array.isArray(notes.additionalResources?.recommendedReading) && notes.additionalResources.recommendedReading.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Reading</h3>
                    <ul className="space-y-2">
                      {notes.additionalResources.recommendedReading.map((resource, index) => (
                        <li key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded block">
                          📖 {resource}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(notes.additionalResources?.practiceProjects) && notes.additionalResources.practiceProjects.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Projects</h3>
                    <ul className="space-y-2">
                      {notes.additionalResources.practiceProjects.map((project, index) => (
                        <li key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded block">
                          💻 {project}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(notes.additionalResources?.nextSteps) && notes.additionalResources.nextSteps.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Moving Forward</h3>
                    <ol className="space-y-2">
                      {notes.additionalResources.nextSteps.map((step, index) => (
                        <li key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded block">
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Practice Exercises */}
            {Array.isArray(notes.practiceExercises) && notes.practiceExercises.length > 0 && (
              <div className="pdf-section bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg ring-1 ring-black/5 p-10 space-y-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <FileText className="w-48 h-48 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white flex items-center relative z-10">
                  <span className="text-gray-700 text-5xl mr-4 -ml-2 select-none">
                    {String(5 + (Array.isArray(notes.topics) ? notes.topics.length : 0)).padStart(2, '0')}
                  </span>
                  Practice Exercises
                </h2>

                <div className="space-y-4 relative z-10">
                  {notes.practiceExercises.map((exercise) => (
                    <div key={exercise.exerciseNumber} className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 hover:bg-white/15 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-white">Exercise {exercise.exerciseNumber}</h3>
                        <Badge
                          className={
                            exercise.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              exercise.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                'bg-red-500/20 text-red-300 border-red-500/30'
                          }
                        >
                          {exercise.difficulty}
                        </Badge>
                      </div>
                      <p className="text-gray-200 mb-4 text-lg">{exercise.question}</p>
                      <div className="bg-black/30 p-3 rounded-lg text-sm text-gray-400 italic">
                        <strong className="text-gray-500 not-italic mr-2">Hint:</strong> {exercise.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-400 text-sm py-8 pb-12">
              <p>© {new Date().getFullYear()} AI Course Genius. Generated for {notes.courseTitle}.</p>
            </div>

          </div>
        </div>
      </Card>
    </div>
  )
}
