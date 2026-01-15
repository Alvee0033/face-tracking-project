"use client"

import { motion } from "framer-motion"
import { MapPin, Briefcase, DollarSign, X, ExternalLink, Building2, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface Job {
    id: string
    job_title: string
    recruiter_profiles?: {
        company_name: string
        company_logo?: string
    }
    company_name?: string // Fallback
    city: string
    country: string
    job_type: string
    work_mode: string
    experience_level: string
    department?: string
    salary_min?: number
    salary_max?: number
    salary_currency: string
    job_description: string
    posted_at?: string
}

interface ModernJobCardProps {
    job: Job
    onRemove: (id: string) => void
    type: "saved" | "interested"
}

export function ModernJobCard({ job, onRemove, type }: ModernJobCardProps) {
    const router = useRouter()

    const formatSalary = (min?: number, max?: number, currency: string = "USD") => {
        if (!min && !max) return "Salary not specified"
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        })

        if (min && max) {
            return `${formatter.format(min)} - ${formatter.format(max)}`
        }
        if (min) return `${formatter.format(min)}+`
        if (max) return `Up to ${formatter.format(max)}`
        return "Salary not specified"
    }

    const companyName = job.recruiter_profiles?.company_name || job.company_name || "Unknown Company"

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
        >
            <Card className="group relative h-full overflow-hidden bg-white/80 backdrop-blur-sm border-gray-200 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300">
                {/* Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-emerald-600/0 group-hover:from-teal-500/5 group-hover:to-emerald-600/5 transition-colors duration-300 pointer-events-none" />

                <div className="p-6 flex flex-col h-full relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors">
                                    <Building2 className="h-5 w-5 text-gray-500 group-hover:text-teal-600 transition-colors" />
                                </div>
                                <span className="text-sm font-medium text-gray-600 line-clamp-1">
                                    {companyName}
                                </span>
                            </div>
                            <h3
                                className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-teal-600 transition-colors cursor-pointer"
                                onClick={() => router.push(`/candidate/jobs/${job.id}`)}
                            >
                                {job.job_title}
                            </h3>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove(job.id)
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 -mr-2 -mt-2 rounded-full hover:bg-red-50 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </motion.button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {job.work_mode}
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100">
                            <Clock className="h-3 w-3 mr-1" />
                            {job.job_type}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-100">
                            <MapPin className="h-3 w-3 mr-1" />
                            {job.city}
                        </Badge>
                    </div>

                    {/* Salary */}
                    <div className="flex items-center text-sm font-medium text-gray-700 mb-4 bg-gray-50 p-2 rounded-md w-fit group-hover:bg-white group-hover:shadow-sm transition-all">
                        <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                        {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </div>

                    {/* Spacer to push buttons to bottom */}
                    <div className="flex-1" />

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                        <Button
                            variant="outline"
                            className="w-full border-gray-200 hover:border-teal-600 hover:text-teal-600 transition-colors"
                            onClick={() => router.push(`/candidate/jobs/${job.id}`)}
                        >
                            Details
                        </Button>
                        <Button
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg hover:shadow-teal-500/30 transition-all font-medium"
                            onClick={() => router.push(`/candidate/jobs/${job.id}`)}
                        >
                            Apply <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
