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
  Award
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { coursesAPI, savedJobsAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

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
      // 1. Try to load from cache first for instant render
      const cachedCourses = localStorage.getItem('candidate_courses');
      const cachedRoadmap = localStorage.getItem('candidate_roadmap');

      if (cachedCourses) {
        setCourses(JSON.parse(cachedCourses));
        setLoading(false); // Show content immediately
      } else {
        setLoading(true);
      }

      if (cachedRoadmap) {
        setRoadmap(JSON.parse(cachedRoadmap));
      }

      // 2. Fetch fresh data in background (or foreground if no cache)
      const [coursesRes, roadmapRes] = await Promise.all([
        coursesAPI.getMyCourses(),
        savedJobsAPI.getLearningRoadmap()
      ])

      const existingCourses = coursesRes.data.courses || []

      // 3. Update state and cache with fresh data
      setCourses(existingCourses)
      setRoadmap(roadmapRes.data.roadmap)

      localStorage.setItem('candidate_courses', JSON.stringify(existingCourses));
      if (roadmapRes.data.roadmap) {
        localStorage.setItem('candidate_roadmap', JSON.stringify(roadmapRes.data.roadmap));
      }

      // Auto-populate courses if roadmap exists
      if (roadmapRes.data.roadmap) {
        // Check if there are skills without courses
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
            return true // Found a skill without courses
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
      console.log('Auto-populate response:', response.data)

      if (response.data.coursesAdded > 0) {
        // Refresh courses
        const coursesRes = await coursesAPI.getMyCourses()
        const newCourses = coursesRes.data.courses || []
        setCourses(newCourses)
        localStorage.setItem('candidate_courses', JSON.stringify(newCourses))
        console.log(`Successfully added ${response.data.coursesAdded} courses`)
      } else {
        console.log('No new courses added (all already populated)')
      }
    } catch (error: any) {
      console.error("Auto-populate error:", error)
      console.error("Error details:", error.response?.data || error.message)
      alert(error.response?.data?.message || "Failed to auto-populate courses. Please try again.")
    } finally {
      setAutoPopulating(false)
    }
  }

  const handleToggleWatch = async (courseId: string, currentStatus: boolean) => {
    try {
      await coursesAPI.updateWatchStatus(courseId, !currentStatus)
      setCourses(courses.map(c =>
        c.id === courseId ? { ...c, is_watched: !currentStatus, watched_at: !currentStatus ? new Date().toISOString() : null } : c
      ))
    } catch (error) {
      console.error("Failed to update watch status:", error)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return

    try {
      await coursesAPI.deleteCourse(courseId)
      setCourses(courses.filter(c => c.id !== courseId))
    } catch (error) {
      console.error("Failed to delete course:", error)
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

  if (loading || autoPopulating) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#14b8a6] mx-auto"></div>
            <p className="text-gray-600 mt-4">
              {autoPopulating ? 'Auto-populating courses from your roadmap...' : 'Loading courses...'}
            </p>
            {autoPopulating && (
              <p className="text-sm text-gray-500 mt-2">This may take a minute</p>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <Card className="p-12 text-center">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learning Roadmap</h3>
            <p className="text-sm text-gray-600 mb-6">
              Create a learning roadmap by adding jobs to your interested list
            </p>
            <Button
              onClick={() => router.push('/candidate/interested-jobs')}
              className="bg-[#14b8a6] hover:bg-[#5330d4] text-white"
            >
              Go to Interested Jobs
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Learning Courses</h1>
              <p className="text-base text-gray-600">
                Curated video courses for each skill in your roadmap
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={autoPopulateCourses}
                disabled={autoPopulating}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                {autoPopulating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    Populating...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Refresh Courses
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/candidate/roadmap')}
                className="border-teal-600 text-teal-600 hover:bg-teal-50"
              >
                <Target className="h-4 w-4 mr-2" />
                View Roadmap
              </Button>
            </div>
          </div>
        </div>

        {/* Learning Phases */}
        <div className="space-y-8">
          {roadmap.learning_phases && roadmap.learning_phases.map((phase: any, phaseIndex: number) => {
            const progress = getPhaseProgress(phase.skills || [])

            return (
              <div key={phase.phase} className="relative">
                {/* Connector Line */}
                {phaseIndex < roadmap.learning_phases.length - 1 && (
                  <div className="absolute left-12 top-full h-8 w-1 bg-gradient-to-b from-teal-600 to-teal-600 z-0 rounded-full"></div>
                )}

                <Card className="relative z-10 overflow-hidden shadow-xl border-2 border-gray-200">
                  {/* Phase Header */}
                  <div className="p-8 bg-gradient-to-r from-teal-50 via-teal-50 to-teal-50 border-b-2 border-teal-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-600 text-white font-bold text-2xl shadow-lg">
                          {phase.phase}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-3xl font-bold text-gray-900 mb-2">{phase.title}</h3>
                          <p className="text-base text-gray-700">{phase.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-gradient-to-r from-teal-600 to-teal-600 text-white text-base px-4 py-2 border-0 shadow-lg">
                          <Clock className="h-4 w-4 mr-2 inline" />
                          {phase.duration}
                        </Badge>
                        <div className="mt-2 text-sm text-gray-600">
                          {progress.watched}/{progress.totalCourses || progress.total} videos watched
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills/Courses in Phase */}
                  <div className="p-8 bg-white">
                    <div className="space-y-4">
                      {phase.skills && phase.skills.map((skill: any, skillIndex: number) => {
                        const skillCourses = getCoursesForSkill(skill.skill)

                        return (
                          <Card key={skillIndex} className="p-6 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:shadow-xl transition-all">
                            <div className="space-y-4">
                              {/* Skill Header */}
                              <div>
                                <h4 className="font-bold text-xl text-gray-900">{skill.skill}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={skill.skill_type === 'new' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                                    {skill.skill_type === 'new' ? '🆕 New Skill' : '⬆️ Upgrade'}
                                  </Badge>
                                  {skill.skill_type === 'upgrade' && (
                                    <span className="text-sm text-gray-600">
                                      {skill.current_level} → {skill.target_level}
                                    </span>
                                  )}
                                  {skillCourses.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {skillCourses.length} video{skillCourses.length > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Courses List */}
                              {skillCourses.length > 0 ? (
                                <div className="border-t pt-4 space-y-3">
                                  {skillCourses.map((course) => (
                                    <div
                                      key={course.id}
                                      onClick={() => {
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
                                      }}
                                      className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#14b8a6] hover:shadow-md transition-all cursor-pointer group"
                                    >
                                      {/* Thumbnail */}
                                      <img
                                        src={course.thumbnail_url}
                                        alt={course.video_title}
                                        className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
                                      />

                                      {/* Details */}
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-2">{course.video_title}</h5>
                                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                          <span className="flex items-center">
                                            <Youtube className="h-3 w-3 mr-1 text-red-600" />
                                            {course.channel_name}
                                          </span>
                                          <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {course.duration}
                                          </span>
                                          {course.is_watched && (
                                            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Watched
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const courseData = {
                                                id: course.id,
                                                title: course.video_title,
                                                description: course.video_description || `Learn ${course.skill_name} at ${course.skill_level} level`,
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
                                            }}
                                            className="bg-[#14b8a6] hover:bg-[#5330d4] text-white text-xs"
                                          >
                                            <Play className="h-3 w-3 mr-1" />
                                            Watch
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleToggleWatch(course.id, course.is_watched)}
                                            className={course.is_watched ? "border-green-600 text-green-600 text-xs" : "text-xs"}
                                          >
                                            {course.is_watched ? (
                                              <>
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Watched
                                              </>
                                            ) : (
                                              <>
                                                Mark Watched
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="border-t pt-4">
                                  <p className="text-sm text-gray-600 italic">
                                    {autoPopulating ? 'Loading courses...' : 'Courses will be auto-populated based on your roadmap.'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <Card className="p-6 mt-10 bg-gradient-to-r from-teal-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Keep Learning!</h3>
              <p className="text-sm text-gray-600">Track your progress and update your roadmap as you grow</p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/candidate/profile/skills')}
                className="border-teal-600 text-teal-600 hover:bg-teal-50"
              >
                <Award className="h-4 w-4 mr-2" />
                Update Skills
              </Button>
              <Button
                onClick={() => router.push('/candidate/roadmap')}
                className="bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 text-white border-0"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Full Roadmap
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
