"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function CourseDetailedPage() {
    const router = useRouter()
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
                // Only check current_course from local storage
                const currentCourse = localStorage.getItem('current_course')
                if (currentCourse) {
                    const courseData = JSON.parse(currentCourse)
                    setCourse(courseData)
                    checkWatchStatus(courseData.id)

                    // Load cached AI content loosely (don't block render)
                    loadCachedAIContent(String(courseData.id))
                } else {
                    // If no current course, redirect back
                    console.warn("No current course found, redirecting...")
                    router.push('/candidate/courses')
                }
            } catch (error) {
                console.error("Error loading course:", error)
            } finally {
                setLoading(false)
            }
        }

        loadCourseData()
    }, [])

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
        if (isWatched) return
        if (localStorage.getItem(`exam_result_${course?.id}`) === 'passed') {
            setIsWatched(true)
            return
        }
        setShowExamModal(true)
    }

    const handleExamPass = () => {
        setIsWatched(true)
        setShowExamModal(false)
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
            localStorage.setItem(cacheKey, JSON.stringify(notesData))
        } catch (error) {
            console.error('Failed to generate notes:', error)
            alert('Failed to generate study notes. Please try again.')
        } finally {
            setLoadingNotes(false)
        }
    }


    if (!course && !loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
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
        <div className="min-h-screen bg-gray-50/50">

            {showMindMap && mindMap && (
                <MindMapViewer mindMap={mindMap} onClose={() => setShowMindMap(false)} />
            )}

            {showNotes && notes && (
                <CourseNotesViewer notes={notes} onClose={() => setShowNotes(false)} />
            )}

            <main className="container mx-auto px-6 py-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push('/candidate/courses')}
                    className="hover:bg-teal-50 text-gray-600 hover:text-teal-700 mb-6 group transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Courses
                </Button>

                {/* Main Content - Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Video Player (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Video Player */}
                        <Card className="overflow-hidden shadow-xl shadow-teal-900/10 border-teal-100 rounded-2xl">
                            <div className="aspect-video bg-black relative">
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
                        <div className="bg-white p-6 rounded-2xl border border-teal-50 shadow-sm">
                            <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{course.title}</h1>
                            <p className="text-gray-600 leading-relaxed">{course.description}</p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {course.skills.map((skill) => (
                                    <Badge
                                        key={skill}
                                        variant="secondary"
                                        className="bg-teal-50 text-teal-700 border border-teal-100 px-3 py-1 hover:bg-teal-100 transition-colors"
                                    >
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>


                        {/* Course Action Buttons */}
                        <div className="flex flex-col gap-4">
                            <Button
                                className={`w-full h-14 text-lg font-medium shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] rounded-xl
                    ${isWatched
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/20'
                                    }`}
                                onClick={handleMarkAsWatched}
                                size="lg"
                                disabled={isWatched}
                            >
                                <div className="flex items-center gap-2">
                                    {isWatched ? (
                                        <>
                                            <CheckCircle className="h-6 w-6 animate-in zoom-in" />
                                            <span>Completed & Passed</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-5 w-5 animate-pulse" />
                                            <span>Mark as Watched & Take Exam</span>
                                        </>
                                    )}
                                </div>
                            </Button>

                            <div className="grid grid-cols-2 gap-4">
                                {course.playlistUrl && (
                                    <Button
                                        variant="outline"
                                        className="border-teal-200 text-teal-700 hover:bg-teal-50 h-12"
                                        onClick={() => window.open(course.playlistUrl, '_blank')}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Full Playlist
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(course.videoUrl, '_blank')}
                                    className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12"
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Watch on {course.platform}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Course Details (1/3 width) */}
                    <div className="space-y-6">
                        {/* AI Analysis Buttons */}
                        <Card className="p-4 bg-gradient-to-br from-white to-teal-50/50 border-teal-100 shadow-md">
                            <h3 className="font-semibold text-teal-900 mb-4 flex items-center">
                                <Sparkles className="h-5 w-5 mr-2 text-teal-600" />
                                AI Learning Assistant
                            </h3>
                            <div className="space-y-3">
                                <Button
                                    className="w-full bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm"
                                    onClick={handleGenerateSummary}
                                    disabled={loadingSummary}
                                >
                                    {loadingSummary ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2" />
                                            Generating...
                                        </>
                                    ) : summary ? (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            View Summary
                                            <Badge variant="secondary" className="ml-auto bg-teal-100 text-teal-800 text-[10px] h-5">Cached</Badge>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate Summary
                                        </>
                                    )}
                                </Button>

                                <Button
                                    className="w-full bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm"
                                    onClick={handleGenerateMindMap}
                                    disabled={loadingMindMap}
                                >
                                    {loadingMindMap ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2" />
                                            Generating...
                                        </>
                                    ) : mindMap ? (
                                        <>
                                            <Network className="h-4 w-4 mr-2" />
                                            View Mind Map
                                            <Badge variant="secondary" className="ml-auto bg-teal-100 text-teal-800 text-[10px] h-5">Cached</Badge>
                                        </>
                                    ) : (
                                        <>
                                            <Network className="h-4 w-4 mr-2" />
                                            Visualize Mind Map
                                        </>
                                    )}
                                </Button>

                                <Button
                                    className="w-full bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm"
                                    onClick={handleGenerateNotes}
                                    disabled={loadingNotes}
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
                                            <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-800 text-[10px] h-5">Cached</Badge>
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
                            <Card className="p-5 bg-white border-teal-100 shadow-md">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                        <Sparkles className="h-5 w-5 text-teal-600" />
                                        <h3 className="font-bold text-gray-900">AI Summary</h3>
                                    </div>

                                    <div className="space-y-4 text-sm max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        <div>
                                            <h4 className="font-semibold text-teal-800 mb-1.5 text-xs uppercase tracking-wide">Overview</h4>
                                            <p className="text-gray-600 leading-relaxed">{summary.overview}</p>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-teal-800 mb-1.5 text-xs uppercase tracking-wide">Key Topics</h4>
                                            <ul className="space-y-2">
                                                {Array.isArray(summary.keyTopics) && summary.keyTopics.length > 0 ? (
                                                    summary.keyTopics.map((topic, index) => (
                                                        <li key={index} className="flex items-start text-gray-600 bg-gray-50 p-2 rounded-md">
                                                            <span className="text-teal-500 mr-2 font-bold">•</span>
                                                            <span>{topic}</span>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-gray-500 text-sm italic">No key topics available</li>
                                                )}
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-teal-800 mb-1.5 text-xs uppercase tracking-wide">What You'll Learn</h4>
                                            <ul className="space-y-2">
                                                {Array.isArray(summary.learningOutcomes) && summary.learningOutcomes.length > 0 ? (
                                                    summary.learningOutcomes.map((outcome, index) => (
                                                        <li key={index} className="flex items-start text-gray-600 bg-emerald-50/50 p-2 rounded-md">
                                                            <span className="text-emerald-500 mr-2">✓</span>
                                                            <span>{outcome}</span>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-gray-500 text-sm italic">No learning outcomes available</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Course Meta Card */}
                        <Card className="p-5 bg-white border-gray-100 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4">Course Info</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center text-gray-700">
                                        <BookOpen className="h-4 w-4 mr-3 text-teal-500" />
                                        <span className="font-medium">Instructor</span>
                                    </div>
                                    <span className="text-gray-900">{course.instructor}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center text-gray-700">
                                        <Clock className="h-4 w-4 mr-3 text-teal-500" />
                                        <span>Duration</span>
                                    </div>
                                    <span className="text-gray-900">{course.duration}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center text-gray-700">
                                        <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">
                                            {course.platform}
                                        </Badge>
                                    </div>
                                    <Badge variant="secondary" className="bg-gray-200 text-gray-800">
                                        {course.level}
                                    </Badge>
                                </div>
                            </div>
                        </Card>

                        {/* Share Button */}
                        <Button
                            variant="outline"
                            className="w-full border-dashed border-gray-300 hover:border-teal-400 hover:bg-teal-50 text-gray-500 hover:text-teal-600"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href)
                                alert('Link copied to clipboard!')
                            }}
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share Course Link
                        </Button>
                    </div>
                </div>
            </main>

            {showExamModal && course && (
                <CourseExamModal
                    isOpen={showExamModal}
                    onClose={() => setShowExamModal(false)}
                    onPass={handleExamPass}
                    topic={course.skills[0] || course.title}
                    courseId={course.id}
                />
            )}
        </div>
    )
}
