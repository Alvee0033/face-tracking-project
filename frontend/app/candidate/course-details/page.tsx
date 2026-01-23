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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-400/20 via-gray-50 to-gray-100 selection:bg-teal-100 selection:text-teal-900">

            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob" />
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-4000" />
            </div>

            {showMindMap && mindMap && (
                <MindMapViewer mindMap={mindMap} onClose={() => setShowMindMap(false)} />
            )}

            {showNotes && notes && (
                <CourseNotesViewer notes={notes} onClose={() => setShowNotes(false)} />
            )}

            <main className="container mx-auto px-6 pt-24 pb-12 max-w-7xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/candidate/courses')}
                        className="group hover:bg-white/50 text-gray-600 hover:text-teal-700 backdrop-blur-sm transition-all duration-300"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Courses
                    </Button>
                </div>

                {/* Main Content - Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Video & Info (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Video Player Section */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                            <Card className="relative overflow-hidden shadow-2xl shadow-teal-900/10 border-white/50 rounded-2xl bg-black/5 backdrop-blur-sm">
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
                        </div>

                        {/* Title & Description Card */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-white/60" />
                            <div className="relative p-8 space-y-6">
                                <div>
                                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-950 to-teal-700 leading-tight mb-4">
                                        {course.title}
                                    </h1>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        {course.skills.map((skill) => (
                                            <Badge
                                                key={skill}
                                                variant="secondary"
                                                className="bg-teal-50/80 text-teal-700 border border-teal-100/50 px-3 py-1 hover:bg-teal-100 transition-colors backdrop-blur-sm"
                                            >
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="pt-4">
                                        <Button
                                            className={`w-full sm:w-auto h-12 text-base font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl border-white/20 border
                                            ${isWatched
                                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25 text-white'
                                                    : 'bg-gradient-to-br from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 shadow-teal-500/25 text-white'
                                                }`}
                                            onClick={handleMarkAsWatched}
                                            disabled={isWatched}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isWatched ? (
                                                    <>
                                                        <div className="p-1 bg-white/20 rounded-full">
                                                            <CheckCircle className="h-4 w-4" />
                                                        </div>
                                                        <span>Course Completed</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-1 bg-white/20 rounded-full animate-pulse">
                                                            <Sparkles className="h-4 w-4" />
                                                        </div>
                                                        <span>Mark Completed & Take Exam</span>
                                                    </>
                                                )}
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                <p className="text-gray-600 leading-relaxed text-lg font-light">
                                    {course.description}
                                </p>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">


                            <div className="flex gap-3">
                                {course.playlistUrl && (
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-16 border-2 border-dashed border-teal-200 text-teal-700 hover:bg-teal-50/50 hover:border-teal-300 rounded-2xl bg-transparent backdrop-blur-sm"
                                        onClick={() => window.open(course.playlistUrl, '_blank')}
                                    >
                                        <ExternalLink className="h-5 w-5 mr-2" />
                                        Playlist
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(course.videoUrl, '_blank')}
                                    className="flex-1 h-16 border-gray-200 text-gray-700 hover:bg-white/80 hover:border-gray-300 rounded-2xl bg-white/40 backdrop-blur-sm"
                                >
                                    <Play className="h-5 w-5 mr-2" />
                                    Watch Output
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - AI Tools & Stats (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* AI Assistant Card */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-teal-100/50 to-purple-100/50 rounded-3xl blur-sm transform group-hover:scale-[1.02] transition-transform duration-500"></div>
                            <Card className="relative p-6 bg-white/60 backdrop-blur-xl border-white/50 shadow-xl rounded-3xl overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="h-24 w-24 text-teal-900" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 text-teal-600 mr-3">
                                        <Sparkles className="h-5 w-5" />
                                    </span>
                                    AI Tools
                                </h3>

                                <div className="space-y-4">
                                    <Button
                                        className="w-full justify-start h-12 bg-white hover:bg-teal-50 text-gray-700 hover:text-teal-700 border border-gray-100 hover:border-teal-200 shadow-sm transition-all group/btn"
                                        onClick={handleGenerateSummary}
                                        disabled={loadingSummary}
                                    >
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md mr-3 group-hover/btn:bg-indigo-100 transition-colors">
                                            <BookOpen className="h-4 w-4" />
                                        </div>
                                        {loadingSummary ? 'Analyzing...' : summary ? 'View Summary' : 'Generate Summary'}
                                        {summary && <CheckCircle className="ml-auto h-4 w-4 text-teal-500" />}
                                    </Button>

                                    <Button
                                        className="w-full justify-start h-12 bg-white hover:bg-teal-50 text-gray-700 hover:text-teal-700 border border-gray-100 hover:border-teal-200 shadow-sm transition-all group/btn"
                                        onClick={handleGenerateMindMap}
                                        disabled={loadingMindMap}
                                    >
                                        <div className="p-1.5 bg-pink-50 text-pink-600 rounded-md mr-3 group-hover/btn:bg-pink-100 transition-colors">
                                            <Network className="h-4 w-4" />
                                        </div>
                                        {loadingMindMap ? 'Generating...' : mindMap ? 'View Mind Map' : 'Generate Mind Map'}
                                        {mindMap && <CheckCircle className="ml-auto h-4 w-4 text-teal-500" />}
                                    </Button>

                                    <Button
                                        className="w-full justify-start h-12 bg-white hover:bg-teal-50 text-gray-700 hover:text-teal-700 border border-gray-100 hover:border-teal-200 shadow-sm transition-all group/btn"
                                        onClick={handleGenerateNotes}
                                        disabled={loadingNotes}
                                    >
                                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md mr-3 group-hover/btn:bg-emerald-100 transition-colors">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        {loadingNotes ? 'Drafting...' : notes ? 'View Study Notes' : 'Generate Notes'}
                                        {notes && <CheckCircle className="ml-auto h-4 w-4 text-teal-500" />}
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* Course Info Card */}
                        <Card className="p-6 bg-white/40 backdrop-blur-md border border-white/50 shadow-lg rounded-3xl">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                                <span className="w-1 h-6 bg-teal-500 rounded-full mr-3"></span>
                                Course Details
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/50">
                                    <div className="flex items-center text-gray-600 text-sm">
                                        <BookOpen className="h-4 w-4 mr-3 text-teal-500" />
                                        Instructor
                                    </div>
                                    <span className="font-semibold text-gray-900 text-sm">{course.instructor}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/50">
                                    <div className="flex items-center text-gray-600 text-sm">
                                        <Clock className="h-4 w-4 mr-3 text-teal-500" />
                                        Duration
                                    </div>
                                    <span className="font-semibold text-gray-900 text-sm">{course.duration}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/50">
                                    <div className="flex items-center text-gray-600 text-sm">
                                        <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50/50">
                                            {course.platform}
                                        </Badge>
                                    </div>
                                    <Badge className="bg-gray-900 text-white shadow-lg shadow-gray-900/20">
                                        {course.level}
                                    </Badge>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                className="w-full mt-4 text-gray-500 hover:text-teal-600 hover:bg-teal-50/50"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href)
                                    alert('Link copied to clipboard!')
                                }}
                            >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share Course
                            </Button>
                        </Card>

                        {/* Recent AI Summary Preview */}
                        {summary && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="p-6 bg-gradient-to-br from-teal-50/90 to-white/90 backdrop-blur-md border-teal-100 shadow-xl rounded-3xl">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="h-4 w-4 text-teal-600" />
                                        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Quick Summary</h3>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-6">
                                        {summary.overview}
                                    </p>
                                </Card>
                            </div>
                        )}
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

