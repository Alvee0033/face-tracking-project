"use client"

import { useRef } from "react"
import { X, Download, FileText, BookOpen } from "lucide-react"
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
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4" style={{ top: '64px' }}>
      <Card className="w-full h-full max-w-5xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Course Study Notes</h2>
              <p className="text-sm text-gray-600">{notes.courseTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              id="download-btn"
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div ref={contentRef} className="max-w-4xl mx-auto space-y-6">

            {/* Cover Page */}
            <div className="pdf-section bg-white rounded-lg shadow-sm p-12 text-center space-y-6 border border-gray-200">
              <div className="inline-block p-6 bg-blue-50 rounded-2xl">
                <BookOpen className="h-20 w-20 text-blue-600" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">{notes.courseTitle}</h1>
              <div className="space-y-2">
                <p className="text-xl text-gray-700 font-medium">Professional Study Guide</p>
                <p className="text-sm text-gray-500">Comprehensive Technical Documentation</p>
              </div>
              <div className="pt-6 flex items-center justify-center gap-4">
                <Badge variant="outline" className="text-sm px-4 py-1 border-blue-600 text-blue-600">
                  {new Date(notes.generatedDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Badge>
                <Badge variant="outline" className="text-sm px-4 py-1 border-gray-400 text-gray-700">
                  {(Array.isArray(notes.topics) ? notes.topics.length : 0) + 5} Sections
                </Badge>
              </div>
            </div>

            {/* Overview */}
            <div className="pdf-section bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">
                1. Course Overview
              </h2>

              {notes.overview?.introduction && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Introduction</h3>
                  <p className="text-gray-700 leading-relaxed">{notes.overview.introduction}</p>
                </div>
              )}

              {notes.overview?.courseScope && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Scope</h3>
                  <p className="text-gray-700 leading-relaxed">{notes.overview.courseScope}</p>
                </div>
              )}

              {notes.overview?.targetAudience && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Audience</h3>
                  <p className="text-gray-700 leading-relaxed">{notes.overview.targetAudience}</p>
                </div>
              )}

              {Array.isArray(notes.overview?.prerequisites) && notes.overview.prerequisites.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Prerequisites</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {notes.overview.prerequisites.map((prereq, index) => (
                      <li key={index}>{prereq}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Learning Objectives */}
            <div className="pdf-section bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">
                2. Learning Objectives
              </h2>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Primary Goals</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {Array.isArray(notes.learningObjectives?.primaryGoals) && notes.learningObjectives.primaryGoals.map((goal, index) => (
                    <li key={index}>{goal}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills You Will Gain</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(notes.learningObjectives?.skillsYouWillGain) && notes.learningObjectives.skillsYouWillGain.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {notes.learningObjectives?.expectedOutcomes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Expected Outcomes</h3>
                  <p className="text-gray-700 leading-relaxed">{notes.learningObjectives.expectedOutcomes}</p>
                </div>
              )}
            </div>

            {/* Topics */}
            {Array.isArray(notes.topics) && notes.topics.map((topic, index) => (
              <div key={index} className="pdf-section bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">
                  {3 + index}. {topic?.title || 'Topic'}
                </h2>

                {topic?.introduction && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Introduction</h3>
                    <p className="text-gray-700 leading-relaxed">{topic.introduction}</p>
                  </div>
                )}

                {Array.isArray(topic?.keyConcepts) && topic.keyConcepts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Concepts</h3>
                    <div className="space-y-3">
                      {topic.keyConcepts.map((concept, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-1">{concept?.concept || 'Concept'}</h4>
                          {concept?.definition && <p className="text-sm text-gray-700 mb-2">{concept.definition}</p>}
                          {concept?.importance && (
                            <p className="text-xs text-gray-600 italic">
                              <strong>Importance:</strong> {concept.importance}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topic?.detailedExplanation && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Detailed Explanation</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{topic.detailedExplanation}</p>
                  </div>
                )}

                {Array.isArray(topic?.practicalExamples) && topic.practicalExamples.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Practical Examples</h3>
                    <div className="space-y-2">
                      {topic.practicalExamples.map((example, idx) => (
                        <div key={idx} className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded">
                          <p className="text-sm text-gray-700">{example}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(topic?.bestPractices) && topic.bestPractices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Best Practices</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {topic.bestPractices.map((practice, idx) => (
                        <li key={idx}>{practice}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(topic?.commonMistakes) && topic.commonMistakes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Common Mistakes to Avoid</h3>
                    <ul className="list-disc list-inside space-y-1 text-orange-700">
                      {topic.commonMistakes.map((mistake, idx) => (
                        <li key={idx}>{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Key Takeaways */}
            <div className="pdf-section bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">
                {3 + (Array.isArray(notes.topics) ? notes.topics.length : 0)}. Key Takeaways & Summary
              </h2>

              {notes.keyTakeaways?.summary && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{notes.keyTakeaways.summary}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Critical Points</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {Array.isArray(notes.keyTakeaways?.criticalPoints) && notes.keyTakeaways.criticalPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-World Applications</h3>
                <div className="space-y-2">
                  {Array.isArray(notes.keyTakeaways?.realWorldApplications) && notes.keyTakeaways.realWorldApplications.map((app, index) => (
                    <div key={index} className="bg-green-50 border-l-4 border-green-600 p-3 rounded">
                      <p className="text-sm text-gray-700">{app}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Resources */}
            <div className="pdf-section bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">
                {4 + (Array.isArray(notes.topics) ? notes.topics.length : 0)}. Additional Resources & Next Steps
              </h2>

              {Array.isArray(notes.additionalResources?.recommendedReading) && notes.additionalResources.recommendedReading.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Recommended Reading</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {notes.additionalResources.recommendedReading.map((resource, index) => (
                      <li key={index}>{resource}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(notes.additionalResources?.practiceProjects) && notes.additionalResources.practiceProjects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Practice Projects</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {notes.additionalResources.practiceProjects.map((project, index) => (
                      <li key={index}>{project}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(notes.additionalResources?.nextSteps) && notes.additionalResources.nextSteps.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Steps</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700">
                    {notes.additionalResources.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Practice Exercises */}
            {Array.isArray(notes.practiceExercises) && notes.practiceExercises.length > 0 && (
              <div className="pdf-section bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 pb-2">
                  {5 + (Array.isArray(notes.topics) ? notes.topics.length : 0)}. Practice Exercises
                </h2>

                <div className="space-y-4">
                  {notes.practiceExercises.map((exercise) => (
                    <div key={exercise.exerciseNumber} className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Exercise {exercise.exerciseNumber}</h3>
                        <Badge
                          variant={exercise.difficulty === 'Easy' ? 'default' : exercise.difficulty === 'Medium' ? 'secondary' : 'destructive'}
                          className={
                            exercise.difficulty === 'Easy' ? 'bg-green-100 text-green-700 border-green-300' :
                              exercise.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                'bg-red-100 text-red-700 border-red-300'
                          }
                        >
                          {exercise.difficulty}
                        </Badge>
                      </div>
                      <p className="text-gray-700">{exercise.question}</p>
                      <p className="text-sm text-gray-600 italic">
                        <strong>Hint:</strong> {exercise.hint}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </Card>
    </div>
  )
}
