"use client"

import { motion } from "framer-motion"
import {
    Target,
    Clock,
    BookOpen,
    Briefcase,
    TrendingUp,
    Award
} from "lucide-react"
import { Card } from "@/components/ui/card"

interface RoadmapStatsProps {
    stats: {
        totalSkills: number
        duration: string
        phases: number
        careerPaths: number
    }
}

export function RoadmapStats({ stats }: RoadmapStatsProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8"
        >
            {/* Skills Stat */}
            <motion.div variants={item}>
                <Card className="relative overflow-hidden p-6 border-blue-100 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Target className="h-20 w-20 text-blue-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-blue-600 tracking-tight">
                            {stats.totalSkills}
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Total Skills</h3>
                    <p className="text-xs text-gray-500 mt-1">Required competencies</p>
                </Card>
            </motion.div>

            {/* Duration Stat */}
            <motion.div variants={item}>
                <Card className="relative overflow-hidden p-6 border-purple-100 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="h-20 w-20 text-purple-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-2xl font-bold text-purple-600 tracking-tight">
                            {stats.duration.split('-')[0]}
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Est. Duration</h3>
                    <p className="text-xs text-gray-500 mt-1 truncate">{stats.duration}</p>
                </Card>
            </motion.div>

            {/* Phases Stat */}
            <motion.div variants={item}>
                <Card className="relative overflow-hidden p-6 border-green-100 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BookOpen className="h-20 w-20 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-green-600 tracking-tight">
                            {stats.phases}
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Modules</h3>
                    <p className="text-xs text-gray-500 mt-1">Learning phases</p>
                </Card>
            </motion.div>

            {/* Career Paths Stat */}
            <motion.div variants={item}>
                <Card className="relative overflow-hidden p-6 border-orange-100 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Briefcase className="h-20 w-20 text-orange-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                            <Award className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-bold text-orange-600 tracking-tight">
                            {stats.careerPaths}
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Career Paths</h3>
                    <p className="text-xs text-gray-500 mt-1">Target roles</p>
                </Card>
            </motion.div>
        </motion.div>
    )
}
