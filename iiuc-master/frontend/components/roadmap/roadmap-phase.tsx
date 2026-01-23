"use client"

import { motion } from "framer-motion"
import {
    BookOpen,
    Clock,
    ChevronRight,
    ExternalLink,
    Code,
    Trophy,
    ArrowUpCircle,
    PlusCircle,
    Lightbulb
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { LearningResources } from "./learning-resources"

interface Skill {
    skill: string
    skill_type: "new" | "upgrade" | string
    category: string
    difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert" | string
    time_estimate: string
    current_level?: string
    target_level?: string
    gap_addressed?: string
    learning_path?: any // Updated to accept object structure
    resources?: any // Updated to accept detailed resource object
    practice_exercises?: any[]
    interview_questions?: string[]
    certifications?: any[]
}

// ... existing interfaces

interface Project {
    title: string
    description: string
}

interface PhaseProps {
    phase: {
        phase: number
        title: string
        duration: string
        description: string
        skills: Skill[]
        prerequisites?: string[]
    }
    projects?: Project[]
    isActive?: boolean
    isLast?: boolean
}

export function RoadmapPhase({ phase, projects, isActive = false, isLast = false }: PhaseProps) {
    const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

    return (
        <div className="relative">
            {/* ... existing timeline code ... */}
            {!isLast && (
                <div className="absolute left-[27px] top-[60px] bottom-[-24px] w-0.5 bg-gradient-to-b from-[#633ff3]/30 to-gray-200 hidden md:block" />
            )}

            <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex gap-6 relative"
            >
                {/* Phase Number / Icon */}
                <div className="flex-shrink-0 relative z-10">
                    <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center border-4 shadow-sm transition-all duration-300",
                        isActive
                            ? "bg-[#633ff3] border-white ring-4 ring-[#633ff3]/20 shadow-[#633ff3]/30"
                            : "bg-white border-gray-100 ring-1 ring-gray-100"
                    )}>
                        <span className={cn(
                            "text-xl font-bold",
                            isActive ? "text-white" : "text-gray-400"
                        )}>
                            {phase.phase}
                        </span>
                    </div>
                </div>

                {/* Content Card */}
                <div className="flex-1 pb-12">
                    <Card className="group overflow-hidden border-gray-200 bg-white/60 backdrop-blur-xl hover:border-[#633ff3]/30 hover:shadow-lg hover:shadow-[#633ff3]/5 transition-all duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100/50 relative overflow-hidden">
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#633ff3]/0 via-transparent to-[#5330d4]/0 group-hover:from-[#633ff3]/5 transition-all duration-500" />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {phase.title}
                                        <Badge variant="secondary" className="bg-[#633ff3]/10 text-[#633ff3] border-0">
                                            {phase.duration}
                                        </Badge>
                                    </h3>
                                    <p className="text-gray-500 mt-1 text-sm leading-relaxed max-w-2xl">
                                        {phase.description}
                                    </p>
                                </div>

                                {phase.prerequisites && phase.prerequisites.length > 0 && (
                                    <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                        <span className="font-medium text-gray-600 block mb-1">Prerequisites:</span>
                                        {phase.prerequisites.join(", ")}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Skills Grid */}
                        <div className="p-6 bg-white/40">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Code className="h-3 w-3" /> Targeted Skills
                            </h4>

                            <div className="space-y-4">
                                {phase.skills && phase.skills.map((rawSkill, idx) => {
                                    const skill = typeof rawSkill === 'string'
                                        ? {
                                            skill: rawSkill,
                                            skill_type: 'new',
                                            category: 'General',
                                            difficulty: 'Beginner',
                                            time_estimate: '2 weeks'
                                        } as Skill
                                        : rawSkill

                                    return (
                                        <motion.div
                                            key={idx}
                                            layout
                                            className={cn(
                                                "rounded-xl border transition-all duration-200 relative overflow-hidden",
                                                expandedSkill === skill.skill
                                                    ? "bg-white border-[#633ff3] shadow-md ring-1 ring-[#633ff3]/20"
                                                    : "bg-white/50 border-gray-200 hover:border-[#633ff3]/50 hover:bg-white"
                                            )}
                                        >
                                            <div
                                                onClick={() => setExpandedSkill(expandedSkill === skill.skill ? null : skill.skill)}
                                                className="p-3 cursor-pointer flex items-start justify-between"
                                            >
                                                <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                                    {skill.skill}
                                                    {skill.skill_type === 'new' ? (
                                                        <PlusCircle className="h-3 w-3 text-emerald-500" />
                                                    ) : (
                                                        <ArrowUpCircle className="h-3 w-3 text-blue-500" />
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Clock className="h-3 w-3" />
                                                        {skill.time_estimate}
                                                    </div>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] h-5 px-1.5 border-0",
                                                        skill.difficulty === 'Beginner' ? "bg-green-100 text-green-700" :
                                                            skill.difficulty === 'Intermediate' ? "bg-blue-100 text-blue-700" :
                                                                "bg-purple-100 text-purple-700"
                                                    )}>
                                                        {skill.difficulty}
                                                    </Badge>
                                                    <ChevronRight className={cn(
                                                        "h-4 w-4 text-gray-400 transition-transform",
                                                        expandedSkill === skill.skill ? "rotate-90" : ""
                                                    )} />
                                                </div>
                                            </div>

                                            {expandedSkill === skill.skill && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="border-t border-gray-100"
                                                >
                                                    <div className="p-4 bg-gray-50/50">
                                                        {/* Learning Path Steps */}
                                                        {skill.learning_path && skill.learning_path.steps && (
                                                            <div className="mb-6">
                                                                <h5 className="font-semibold text-sm text-gray-900 mb-3">Learning Path</h5>
                                                                <div className="space-y-3">
                                                                    {skill.learning_path.steps.map((step: any, sIdx: number) => (
                                                                        <div key={sIdx} className="flex gap-3 text-sm">
                                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#633ff3]/10 text-[#633ff3] flex items-center justify-center text-xs font-bold">
                                                                                {sIdx + 1}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-gray-900">{step.title}</p>
                                                                                <p className="text-xs text-gray-500 mb-1">{step.duration}</p>
                                                                                <ul className="list-disc list-inside text-gray-600 text-xs pl-1">
                                                                                    {step.objectives?.map((obj: string, oIdx: number) => (
                                                                                        <li key={oIdx}>{obj}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <LearningResources
                                                            resources={skill.resources}
                                                            practice_exercises={skill.practice_exercises}
                                                            interview_questions={skill.interview_questions}
                                                            certifications={skill.certifications}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Project Ideas */}
                        {
                            projects && projects.length > 0 && (
                                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600 mt-1">
                                            <Lightbulb className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm mb-1">Apply Your Knowledge</h4>
                                            <div className="space-y-2">
                                                {projects.map((project, pIdx) => (
                                                    <div key={pIdx} className="flex items-start gap-2 text-sm text-gray-600">
                                                        <Trophy className="h-4 w-4 text-gray-400 mt-0.5" />
                                                        <span>
                                                            <span className="font-medium text-gray-800">{project.title}:</span> {project.description}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    </Card >
                </div >
            </motion.div >
        </div >
    )
}
