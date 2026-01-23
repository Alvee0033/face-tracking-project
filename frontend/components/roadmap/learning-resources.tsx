"use client"

import { motion } from "framer-motion"
import {
    BookOpen,
    Video,
    GraduationCap,
    FileText,
    Code2,
    Award,
    ExternalLink,
    CheckCircle2,
    Star
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface Course {
    name: string
    platform: string
    instructor?: string
    rating?: number
    url?: string
}

interface Book {
    title: string
    author: string
    year?: number
}

interface Video {
    name: string
    channel: string
    url?: string
    duration?: string
}

interface PracticeExercise {
    title: string
    difficulty: string
    time: string
    concepts: string[]
}

interface Certification {
    name: string
    provider: string
    cost?: string
    prep_time?: string
}

interface Resources {
    courses?: Course[]
    books?: Book[]
    videos?: Video[]
    docs?: string[]
    practice_platforms?: string[]
}

interface LearningResourcesProps {
    resources?: Resources
    practice_exercises?: PracticeExercise[]
    interview_questions?: string[]
    certifications?: Certification[]
}

export function LearningResources({
    resources,
    practice_exercises,
    interview_questions,
    certifications
}: LearningResourcesProps) {
    const [completed, setCompleted] = useState<Set<string>>(new Set())

    const toggleComplete = (id: string) => {
        const newCompleted = new Set(completed)
        if (newCompleted.has(id)) {
            newCompleted.delete(id)
        } else {
            newCompleted.add(id)
        }
        setCompleted(newCompleted)
    }

    return (
        <div className="space-y-6">
            {/* Online Courses */}
            {resources?.courses && resources.courses.length > 0 && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                        Online Courses
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                        {resources.courses.map((course, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                onClick={() => toggleComplete(`course-${idx}`)}
                            >
                                <div className="mt-1">
                                    {completed.has(`course-${idx}`) ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 group-hover:border-blue-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-sm text-gray-900 leading-tight">{course.name}</p>
                                        {course.rating && (
                                            <Badge variant="outline" className="flex items-center gap-1 text-xs shrink-0">
                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                {course.rating}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {course.platform} {course.instructor && `• ${course.instructor}`}
                                    </p>
                                    {course.url && (
                                        <a
                                            href={`https://${course.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            View Course <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Books */}
            {resources?.books && resources.books.length > 0 && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        Recommended Books
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                        {resources.books.map((book, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer"
                                onClick={() => toggleComplete(`book-${idx}`)}
                            >
                                <div className="mt-1">
                                    {completed.has(`book-${idx}`) ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm text-gray-900">{book.title}</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        by {book.author} {book.year && `(${book.year})`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Videos */}
            {resources?.videos && resources.videos.length > 0 && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                        <Video className="h-5 w-5 text-red-600" />
                        Video Tutorials
                    </h4>
                    <div className="space-y-2">
                        {resources.videos.map((video, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-red-300 hover:bg-red-50/30 transition-all cursor-pointer"
                                onClick={() => toggleComplete(`video-${idx}`)}
                            >
                                <div>
                                    {completed.has(`video-${idx}`) ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm text-gray-900">{video.name}</p>
                                    <p className="text-xs text-gray-600">
                                        {video.channel} {video.duration && `• ${video.duration}`}
                                    </p>
                                </div>
                                {video.url && (
                                    <ExternalLink className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Practice Exercises */}
            {practice_exercises && practice_exercises.length > 0 && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                        <Code2 className="h-5 w-5 text-purple-600" />
                        Practice Exercises
                    </h4>
                    <div className="space-y-3">
                        {practice_exercises.map((exercise, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-lg border border-purple-100 bg-purple-50/30 hover:bg-purple-50/50 transition-all cursor-pointer"
                                onClick={() => toggleComplete(`exercise-${idx}`)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        {completed.has(`exercise-${idx}`) ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-full border-2 border-purple-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-gray-900">{exercise.title}</p>
                                            <Badge variant="outline" className="text-xs">
                                                {exercise.difficulty}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">⏱️ {exercise.time}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {exercise.concepts.map((concept, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {concept}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Certifications */}
            {certifications && certifications.length > 0 && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                        <Award className="h-5 w-5 text-amber-600" />
                        Recommended Certifications
                    </h4>
                    <div className="space-y-3">
                        {certifications.map((cert, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-lg border border-amber-100 bg-amber-50/30"
                            >
                                <p className="font-semibold text-gray-900">{cert.name}</p>
                                <p className="text-sm text-gray-600 mt-1">Provider: {cert.provider}</p>
                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                    {cert.cost && <span>💰 {cert.cost}</span>}
                                    {cert.prep_time && <span>⏱️ Prep: {cert.prep_time}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Interview Questions */}
            {interview_questions && interview_questions.length > 0 && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Common Interview Questions
                    </h4>
                    <div className="space-y-2">
                        {interview_questions.map((question, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-3 rounded-lg border border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer"
                                onClick={() => toggleComplete(`question-${idx}`)}
                            >
                                <div className="mt-0.5">
                                    {completed.has(`question-${idx}`) ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border-2 border-indigo-300" />
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 flex-1 leading-relaxed">{question}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
