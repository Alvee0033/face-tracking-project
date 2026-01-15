"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Play, Clock, BookOpen, ExternalLink, Share2, Download, Sparkles, Network, FileText, CheckCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { MindMapViewer } from "@/components/mind-map-viewer"
import { CourseNotesViewer } from "@/components/course-notes-viewer"
import { aiAnalysisAPI } from "@/lib/api"
import { CourseExamModal } from "@/components/course-exam-modal"

interface Course {
  id: string
  title: string
  description: string
  platform: string
  duration: string
  level: string
  instructor: string
  videoUrl: string
  thumbnail: string
  skills: string[]
  playlistUrl?: string
}

interface CourseSummary {
  overview: string
  keyTopics: string[]
  learningOutcomes: string[]
  targetAudience: string
  prerequisites: string
  timeCommitment: string
}

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
  topics: any[]
  keyTakeaways: any
  additionalResources: any
  practiceExercises: any[]
}

interface MindMapData {
  title: string
  nodes: Array<{
    id: string
    label: string
    level: number
    parentId: string | null
    color: string
  }>
}

export default function CourseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<CourseSummary | null>(null)
  const [mindMap, setMindMap] = useState<MindMapData | null>(null)
  const [notes, setNotes] = useState<CourseNotes | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingMindMap, setLoadingMindMap] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showMindMap, setShowMindMap] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showExamModal, setShowExamModal] = useState(false)
  const [isWatched, setIsWatched] = useState(false)

  useEffect(() => {
    // Immediate check for cached data to avoid layout shift/loading spinner
    const loadCourseData = () => {
      try {
        // 1. Check current_course (fastest)
        const currentCourse = localStorage.getItem('current_course')
        if (currentCourse) {
          const courseData = JSON.parse(currentCourse)
          if (courseData.id === params.id) {
            setCourse(courseData)
            checkWatchStatus(courseData.id)
            setLoading(false)
            return
          }
        }

        // 2. Fallback to generated_courses list
        const storedCourses = localStorage.getItem('generated_courses')
        if (storedCourses) {
          const courses = JSON.parse(storedCourses)
          const foundCourse = courses.find((c: Course) => c.id === params.id)

          if (foundCourse) {
            setCourse(foundCourse)
            checkWatchStatus(foundCourse.id)

            // Load cached AI content loosely (don't block render)
            loadCachedAIContent(foundCourse.id)
          }
        }
      } catch (error) {
        console.error("Error loading course:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCourseData()
  }, [params.id])

  const checkWatchStatus = (courseId: string) => {
    const examResult = localStorage.getItem(`exam_result_${courseId}`)
    if (examResult === 'passed') {
      setIsWatched(true)
    }
  }

  const loadCachedAIContent = (courseId: string) => {
    const cachedSummary = localStorage.getItem(`course_${courseId}_summary`)
    const cachedMindMap = localStorage.getItem(`course_${courseId}_mindmap`)
    const cachedNotes = localStorage.getItem(`course_${courseId}_notes`)

    if (cachedSummary) setSummary(JSON.parse(cachedSummary))
    if (cachedMindMap) setMindMap(JSON.parse(cachedMindMap))
    if (cachedNotes) setNotes(JSON.parse(cachedNotes))
  }

  const handleMarkAsWatched = () => {
    // If already watched, just return (or maybe show success message)
    if (isWatched) return

    // Verify if exam was passed in another session (redundant check but safe)
    if (localStorage.getItem(`exam_result_${course?.id}`) === 'passed') {
      setIsWatched(true)
      return
    }

    // Force modal open
    setShowExamModal(true)
  }

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    return match ? match[1] : null
  }

  const getEmbedUrl = (url: string) => {
    const videoId = extractVideoId(url)
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }

  const handleGenerateSummary = async () => {
    if (!course) return

    // Check cache first
    const cacheKey = `course_${course.id}_summary`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setSummary(JSON.parse(cached))
      return
    }

    setLoadingSummary(true)
    try {
      const response = await aiAnalysisAPI.generateCourseSummary({
        title: course.title,
        description: course.description,
        skills: course.skills,
        duration: course.duration,
        level: course.level,
        instructor: course.instructor,
        platform: course.platform
      })

      const summaryData = response.data.data.summary
      setSummary(summaryData)
      // Cache the summary
      localStorage.setItem(cacheKey, JSON.stringify(summaryData))
    } catch (error) {
      console.error('Failed to generate summary:', error)
      alert('Failed to generate summary. Please try again.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleGenerateMindMap = async () => {
    if (!course) return

    // Check cache first
    const cacheKey = `course_${course.id}_mindmap`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setMindMap(JSON.parse(cached))
      setShowMindMap(true)
      return
    }

    setLoadingMindMap(true)
    try {
      const response = await aiAnalysisAPI.generateCourseMindMap({
        title: course.title,
        description: course.description,
        skills: course.skills,
        level: course.level
      })

      const mindMapData = response.data.data.mindMap
      setMindMap(mindMapData)
      setShowMindMap(true)
      // Cache the mind map
      localStorage.setItem(cacheKey, JSON.stringify(mindMapData))
    } catch (error) {
      console.error('Failed to generate mind map:', error)
      alert('Failed to generate mind map. Please try again.')
    } finally {
      setLoadingMindMap(false)
    }
  }

  const handleGenerateNotes = async () => {
    if (!course) return

    // Check cache first
    const cacheKey = `course_${course.id}_notes`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setNotes(JSON.parse(cached))
      setShowNotes(true)
      return
    }

    setLoadingNotes(true)
    try {
      const response = await aiAnalysisAPI.generateCourseNotes({
        title: course.title,
        description: course.description,
        skills: course.skills,
        duration: course.duration,
        level: course.level,
        instructor: course.instructor,
        platform: course.platform
      })

      const notesData = response.data.data.notes
      setNotes(notesData)
      setShowNotes(true)
      // Cache the notes
      localStorage.setItem(cacheKey, JSON.stringify(notesData))
    } catch (error) {
      console.error('Failed to generate notes:', error)
      alert('Failed to generate study notes. Please try again.')
    } finally {
      setLoadingNotes(false)
    }
  }



  const handleExamPass = () => {
    setIsWatched(true)
    setShowExamModal(false)
    // Update local storage or backend
    if (course) {
      // Ideally call backend API to update progress
    }
  }

  // Remove blocking loading state - page should render immediately with cached data
  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <div className="flex items-center justify-center h-[calc(100vh-80px)]">
  //         <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#633ff3]"></div>
  //       </div>
  //     </div>
  //   )
  // }

  if (!course && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-6">The course you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => router.push('/candidate/courses')}
            className="bg-[#633ff3] hover:bg-[#5330d4] text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    )
  }

  // Show skeleton while loading
  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="aspect-video bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-40 bg-gray-200 rounded"></div>
                <div className="h-40 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {showMindMap && mindMap && (
        <MindMapViewer mindMap={mindMap} onClose={() => setShowMindMap(false)} />
      )}

      {showNotes && notes && (
        <CourseNotesViewer notes={notes} onClose={() => setShowNotes(false)} />
      )}

      <main className="container mx-auto px-6 py-4 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/candidate/courses')}
          className="hover:bg-gray-100 mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        {/* Main Content - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Video Player (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-black">
                <iframe
                  src={getEmbedUrl(course.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={course.title}
                />
              </div>
            </Card>

            {/* Course Title and Description */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-sm text-gray-600">{course.description}</p>
            </div>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2">
              {course.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-[#633ff3]/10 text-[#633ff3] border-0 text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>

            {/* Course Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                className={`w-full ${isWatched ? 'bg-green-600 hover:bg-green-700' : 'bg-[#14b8a6] hover:bg-teal-700'} text-white shadow-lg shadow-teal-900/20 transition-all hover:scale-[1.02]`}
                onClick={handleMarkAsWatched}
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {isWatched ? 'Course Completed' : 'Mark as Watched & Take Exam'}
              </Button>
              <div className="flex gap-3">
                {course.playlistUrl && (
                  <Button
                    className="bg-[#633ff3] hover:bg-[#5330d4] text-white flex-1"
                    onClick={() => window.open(course.playlistUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Playlist
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => window.open(course.videoUrl, '_blank')}
                  className="border-[#633ff3] text-[#633ff3] hover:bg-[#633ff3]/5 flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch on {course.platform}
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column - Course Details (1/3 width) */}
        <div className="space-y-4">
          {/* AI Analysis Buttons */}
          <Card className="p-3 bg-gradient-to-br from-[#633ff3]/5 to-[#8b5cf6]/5 border-[#633ff3]/20">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-[#633ff3]" />
              AI-Powered Analysis
            </h3>
            <div className="space-y-2">
              <Button
                className="w-full bg-[#633ff3] hover:bg-[#5330d4] text-white"
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                size="sm"
              >
                {loadingSummary ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : summary ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    View Summary
                    <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">✓ Cached</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#633ff3] text-[#633ff3] hover:bg-[#633ff3]/10"
                onClick={handleGenerateMindMap}
                disabled={loadingMindMap}
                size="sm"
              >
                {loadingMindMap ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#633ff3] mr-2" />
                    Generating...
                  </>
                ) : mindMap ? (
                  <>
                    <Network className="h-4 w-4 mr-2" />
                    View Mind Map
                    <span className="ml-2 text-xs bg-[#633ff3]/10 px-2 py-0.5 rounded border border-[#633ff3]/30">✓ Cached</span>
                  </>
                ) : (
                  <>
                    <Network className="h-4 w-4 mr-2" />
                    Visualize Mind Map
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                onClick={handleGenerateNotes}
                disabled={loadingNotes}
                size="sm"
              >
                {loadingNotes ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 mr-2" />
                    Generating...
                  </>
                ) : notes ? (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    View Study Notes
                    <span className="ml-2 text-xs bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">✓ Cached</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Study Notes
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* AI Summary Display */}
          {summary && (
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <h3 className="font-bold text-gray-900 text-sm">AI Summary</h3>
                </div>

                <div className="space-y-3 text-sm max-h-[400px] overflow-y-auto">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1 text-xs">Overview</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">{summary.overview}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1 text-xs">Key Topics</h4>
                    <ul className="space-y-1">
                      {summary.keyTopics.map((topic, index) => (
                        <li key={index} className="flex items-start text-gray-600">
                          <span className="text-green-600 mr-2 text-xs">•</span>
                          <span className="text-xs">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1 text-xs">What You'll Learn</h4>
                    <ul className="space-y-1">
                      {summary.learningOutcomes.map((outcome, index) => (
                        <li key={index} className="flex items-start text-gray-600">
                          <span className="text-green-600 mr-2 text-xs">✓</span>
                          <span className="text-xs">{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Target:</span> {summary.targetAudience}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Prerequisites:</span> {summary.prerequisites}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Time:</span> {summary.timeCommitment}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Course Meta Card */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Course Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center text-gray-700">
                <BookOpen className="h-4 w-4 mr-2 text-[#633ff3] flex-shrink-0" />
                <span className="font-medium truncate">{course.instructor}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="h-4 w-4 mr-2 text-[#633ff3] flex-shrink-0" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-[#633ff3]/30 text-[#633ff3] text-xs">
                  {course.platform}
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-xs">
                  {course.level}
                </Badge>
              </div>
            </div>
          </Card>

          {/* What You'll Learn Card */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">What You'll Learn</h3>
            <ul className="space-y-2 text-sm">
              {course.skills.slice(0, 5).map((skill, index) => (
                <li key={index} className="flex items-start text-gray-600">
                  <span className="text-[#633ff3] mr-2 flex-shrink-0">✓</span>
                  <span className="text-xs leading-relaxed">{skill}</span>
                </li>
              ))}
              {course.skills.length > 5 && (
                <li className="text-xs text-gray-500 italic">
                  +{course.skills.length - 5} more skills
                </li>
              )}
            </ul>
          </Card>

          {/* Instructor Card */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Instructor</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#633ff3]/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-[#633ff3]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm truncate">{course.instructor}</h4>
                <p className="text-xs text-gray-600">Course Instructor</p>
              </div>
            </div>
          </Card>

          {/* Share Button */}
          <Button
            variant="outline"
            className="w-full hover:bg-gray-100"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert('Link copied to clipboard!')
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Course
          </Button>
        </div>

      </main >
      {showExamModal && course && (
        <CourseExamModal
          isOpen={showExamModal}
          onClose={() => setShowExamModal(false)}
          onPass={handleExamPass}
          topic={course.skills[0] || course.title} // Use first skill or title as topic
          courseId={course.id}
        />
      )
      }
    </div >
  )
}
