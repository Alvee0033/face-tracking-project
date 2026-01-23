"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Clock,
  Play,
  CheckCircle,
  PlusCircle,
  Trash2,
  Youtube,
  TrendingUp,
  Target,
  Award,
  Sparkles,
  ArrowUp,
  Layout,
  RefreshCw,
  Hash,
  ChevronRight,
  Star
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { coursesAPI, savedJobsAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Course {
  id: string
  skill_name: string
  skill_level: string
  phase_number: number
  youtube_video_id: string
  video_title: string
  video_description: string
  thumbnail_url: string
  channel_name: string
  duration: string
  is_watched: boolean
  watched_at: string | null
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [roadmap, setRoadmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoPopulating, setAutoPopulating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      if (typeof window !== 'undefined') {
        const cachedCourses = localStorage.getItem('candidate_courses');
        const cachedRoadmap = localStorage.getItem('candidate_roadmap');

        if (cachedCourses) {
          setCourses(JSON.parse(cachedCourses));
          setLoading(false);
        } else {
          setLoading(true);
        }

        if (cachedRoadmap) {
          setRoadmap(JSON.parse(cachedRoadmap));
        }
      }

      const [coursesRes, roadmapRes] = await Promise.all([
        coursesAPI.getMyCourses(),
        savedJobsAPI.getLearningRoadmap()
      ])

      const existingCourses = coursesRes.data.courses || []

      setCourses(existingCourses)
      setRoadmap(roadmapRes.data.roadmap)

      if (typeof window !== 'undefined') {
        localStorage.setItem('candidate_courses', JSON.stringify(existingCourses));
        if (roadmapRes.data.roadmap) {
          localStorage.setItem('candidate_roadmap', JSON.stringify(roadmapRes.data.roadmap));
        }
      }

      if (roadmapRes.data.roadmap) {
        const hasMissingCourses = checkForMissingCourses(roadmapRes.data.roadmap, existingCourses)

        if (hasMissingCourses) {
          console.log('Missing courses detected, auto-populating...')
          await autoPopulateCourses()
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkForMissingCourses = (roadmap: any, existingCourses: Course[]) => {
    if (!roadmap.learning_phases) return false

    const existingSkillKeys = new Set(
      existingCourses.map(c => `${c.skill_name}-${c.skill_level}`)
    )

    for (const phase of roadmap.learning_phases) {
      if (phase.skills && Array.isArray(phase.skills)) {
        for (const skill of phase.skills) {
          const skillKey = `${skill.skill}-${skill.skill_type === 'upgrade' ? skill.target_level : (skill.target_level || 'Intermediate')}`
          if (!existingSkillKeys.has(skillKey)) {
            return true
          }
        }
      }
    }
    return false
  }

  const autoPopulateCourses = async () => {
    try {
      setAutoPopulating(true)
      console.log('Starting auto-populate...')
      const response = await coursesAPI.autoPopulate()

      if (response.data.coursesAdded > 0) {
        const coursesRes = await coursesAPI.getMyCourses()
        const newCourses = coursesRes.data.courses || []
        setCourses(newCourses)
        if (typeof window !== 'undefined') {
          localStorage.setItem('candidate_courses', JSON.stringify(newCourses))
        }
        console.log(`Successfully added ${response.data.coursesAdded} courses`)
      }
    } catch (error: any) {
      console.error("Auto-populate error:", error)
    } finally {
      setAutoPopulating(false)
    }
  }

  const handleToggleWatch = async (courseId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await coursesAPI.updateWatchStatus(courseId, !currentStatus)
      const updatedCourses = courses.map(c =>
        c.id === courseId ? { ...c, is_watched: !currentStatus, watched_at: !currentStatus ? new Date().toISOString() : null } : c
      );
      setCourses(updatedCourses);
      if (typeof window !== 'undefined') {
        localStorage.setItem('candidate_courses', JSON.stringify(updatedCourses));
      }
    } catch (error) {
      console.error("Failed to update watch status:", error)
    }
  }

  const getCoursesForSkill = (skillName: string) => {
    return courses.filter(c => c.skill_name === skillName)
  }

  const getPhaseProgress = (phaseSkills: any[]) => {
    const skillsWithCourses = phaseSkills.filter(skill => getCoursesForSkill(skill.skill).length > 0)
    const watchedCount = phaseSkills.reduce((count, skill) => {
      const skillCourses = getCoursesForSkill(skill.skill)
      return count + skillCourses.filter(c => c.is_watched).length
    }, 0)
    const totalCourses = phaseSkills.reduce((count, skill) => {
      return count + getCoursesForSkill(skill.skill).length
    }, 0)
    return {
      total: phaseSkills.length,
      withCourses: skillsWithCourses.length,
      watched: watchedCount,
      totalCourses
    }
  }

  const navToCourse = (course: Course) => {
    const courseData = {
      id: course.id,
      title: course.video_title,
      description: course.video_description,
      platform: 'YouTube',
      duration: course.duration,
      level: course.skill_level,
      instructor: course.channel_name,
      videoUrl: `https://www.youtube.com/watch?v=${course.youtube_video_id}`,
      thumbnail: course.thumbnail_url,
      skills: [course.skill_name]
    }
    localStorage.setItem('current_course', JSON.stringify(courseData))
    router.push('/candidate/course-details')
  }

  if (loading && !courses.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-500 mt-4 font-medium animate-pulse">Loading your learning path...</p>
        </div>
      </div>
    )
  }

  if (!roadmap && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-12">
        <Card className="max-w-2xl mx-auto p-12 text-center shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-3xl">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Learning Roadmap Yet</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Your personalized learning journey begins when you add jobs to your interested list. Only then can we curate the best content for you.
          </p>
          <Button
            onClick={() => router.push('/candidate/interested-jobs')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-lg shadow-teal-500/20 shadow-xl transition-all hover:scale-105"
          >
            Find Jobs & Build Roadmap
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black text-slate-900 tracking-tight"
            >
              My Learning Path
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-slate-500 max-w-3xl font-medium"
            >
              Curated, high-quality video courses to help you master your career goals.
            </motion.p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={autoPopulateCourses}
              disabled={autoPopulating}
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors shadow-sm text-base h-12 px-6 rounded-xl"
            >
              {autoPopulating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-3" />
                  Refresh content
                </>
              )}
            </Button>
            <Button
              size="lg"
              onClick={() => router.push('/candidate/roadmap')}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-500/20 border-0 text-base h-12 px-6 rounded-xl font-semibold"
            >
              <Layout className="h-5 w-5 mr-3" />
              Detailed Roadmap
            </Button>
          </div>
        </div>

        {/* Roadmap Phases */}
        <div className="space-y-20">
          {roadmap?.learning_phases?.map((phase: any, phaseIndex: number) => {
            const progress = getPhaseProgress(phase.skills || [])
            const isCompleted = progress.watched === (progress.totalCourses || progress.total) && progress.total > 0;

            return (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                key={phase.phase}
                className="relative"
              >
                {/* Connector Line */}
                {phaseIndex < roadmap.learning_phases.length - 1 && (
                  <div className="absolute left-[2.5rem] top-24 bottom-[-5rem] w-1 bg-slate-200 -z-10 hidden xl:block"></div>
                )}

                <div className="relative z-10">
                  {/* Phase Header */}
                  <div className="flex items-center gap-8 mb-10">
                    <div className={`
                            flex items-center justify-center w-20 h-20 rounded-3xl flex-shrink-0 font-bold text-3xl shadow-xl transform rotate-3
                            ${isCompleted ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white' : 'bg-white text-slate-800 border-2 border-slate-100'}
                        `}>
                      {phase.phase}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-4">
                        {phase.title}
                        {isCompleted && <CheckCircle className="w-8 h-8 text-teal-500" />}
                      </h3>
                      <div className="flex items-center gap-6 text-base font-medium text-slate-500">
                        <span className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                          <Clock className="w-5 h-5 mr-2 text-teal-500" />
                          {phase.duration}
                        </span>
                        <span>
                          {progress.watched} of {progress.totalCourses} lessons completed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills Grid - Using Large Grid instead of Masonry for "Big" feel */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {phase.skills?.map((skill: any, skillIndex: number) => {
                      const skillCourses = getCoursesForSkill(skill.skill)

                      return (
                        <div key={skillIndex} className="flex flex-col h-full">
                          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-teal-900/5 transition-all duration-300 overflow-hidden flex flex-col h-full group">

                            {/* Skill Header */}
                            <div className="p-8 border-b border-slate-50 bg-gradient-to-r from-gray-50/50 to-white">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-2xl text-slate-800" title={skill.skill}>{skill.skill}</h4>
                                <div className="flex gap-2">
                                  {skill.skill_type === 'new' ? (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 shadow-none px-3 py-1 text-sm">
                                      <Sparkles className="w-4 h-4 mr-1.5" /> New
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 shadow-none px-3 py-1 text-sm">
                                      <ArrowUp className="w-4 h-4 mr-1.5" /> Upgrade
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">
                                {skill.skill_type === 'upgrade'
                                  ? `${skill.current_level} → ${skill.target_level}`
                                  : `${skill.target_level || 'Fundamental'} Level`
                                }
                              </p>
                            </div>

                            {/* Courses List - Full Width Items for "Too Small" Fix */}
                            <div className="p-6 md:p-8 flex-1 bg-white">
                              {skillCourses.length > 0 ? (
                                <div className="space-y-8">
                                  {skillCourses.map((course, idx) => (
                                    <div
                                      key={course.id}
                                      onClick={() => navToCourse(course)}
                                      className="group/card cursor-pointer flex flex-col md:flex-row gap-6 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                                    >
                                      {/* Large Thumbnail */}
                                      <div className="relative w-full md:w-64 aspect-video rounded-xl overflow-hidden bg-slate-100 shadow-md flex-shrink-0">
                                        <img
                                          src={course.thumbnail_url}
                                          alt={course.video_title}
                                          className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                                        />

                                        {/* Number Badge */}
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10">
                                          {idx + 1}
                                        </div>

                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover/card:scale-100 transition-transform">
                                            <Play className="w-6 h-6 text-teal-600 ml-1" />
                                          </div>
                                        </div>

                                        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-md font-medium">
                                          {course.duration}
                                        </div>

                                        {course.is_watched && (
                                          <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                                            <CheckCircle className="w-4 h-4" />
                                          </div>
                                        )}
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 flex flex-col justify-center">
                                        <h5 className="font-bold text-slate-800 text-lg leading-snug mb-3 group-hover/card:text-teal-700 transition-colors">
                                          {course.video_title}
                                        </h5>

                                        <div className="flex items-center text-sm text-slate-500 mb-6">
                                          <Youtube className="w-4 h-4 mr-2 text-red-500" />
                                          <span className="font-medium">{course.channel_name}</span>
                                        </div>

                                        <div className="flex items-center gap-3 mt-auto">
                                          <button
                                            className="flex-1 bg-teal-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-teal-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                                            onClick={(e) => { e.stopPropagation(); navToCourse(course); }}
                                          >
                                            Watch Now
                                          </button>
                                          <button
                                            onClick={(e) => handleToggleWatch(course.id, course.is_watched, e)}
                                            className={cn(
                                              "px-4 py-2.5 rounded-lg text-sm font-bold border transition-all",
                                              course.is_watched
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                          >
                                            {course.is_watched ? "Done" : "Mark Done"}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                    <BookOpen className="w-8 h-8 text-slate-300" />
                                  </div>
                                  <h5 className="text-lg font-bold text-slate-700 mb-1">No courses available</h5>
                                  <p className="text-slate-500">
                                    {autoPopulating ? 'We are currently curating content for you...' : 'Refresh to find courses'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-32 relative overflow-hidden rounded-[3rem] bg-slate-900 text-white p-12 lg:p-24 text-center shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-500 rounded-full blur-[150px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500 rounded-full blur-[150px]"></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-10 border border-white/20 shadow-2xl">
              <Star className="w-10 h-10 text-yellow-300 fill-yellow-300" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-8 leading-tight">
              Keep Pushing Barriers.
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-12 font-medium">
              "Capacity is a state of mind. You don't know your limits until you expand them."
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                onClick={() => router.push('/candidate/profile/skills')}
                className="h-16 px-10 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-slate-100 hover:scale-105 transition-all shadow-xl w-full sm:w-auto"
              >
                Update Your Skills
              </Button>
              <Button
                onClick={() => router.push('/candidate/roadmap')}
                className="h-16 px-10 rounded-2xl bg-transparent border-2 border-white/20 text-white text-lg font-bold hover:bg-white/10 w-full sm:w-auto"
              >
                Explore Roadmap <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
