"use client"

import { motion } from "framer-motion"
import {
    DollarSign,
    TrendingUp,
    Building2,
    Globe,
    Users,
    MessageSquare,
    Linkedin,
    Calendar,
    Target
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CareerInsightsProps {
    career_insights?: {
        salary_ranges?: {
            entry_level?: string
            mid_level?: string
            senior_level?: string
        }
        job_market?: {
            demand?: string
            growth_rate?: string
            top_companies?: string[]
            remote_opportunities?: string
        }
        job_titles?: string[]
    }
    interview_prep?: {
        technical_questions?: string[]
        behavioral_questions?: string[]
        assessment_tips?: string[]
        mock_interview_resources?: string[]
    }
    networking?: {
        communities?: Array<{ name: string; platform: string; url?: string; members?: string }>
        conferences?: string[]
        mentorship?: string[]
        linkedin_tips?: string[]
    }
}

export function CareerInsights({ career_insights, interview_prep, networking }: CareerInsightsProps) {
    return (
        <div className="space-y-6">
            {/* Salary Ranges */}
            {career_insights?.salary_ranges && (
                <Card className="p-6 bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200">
                    <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Salary Expectations
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        {career_insights.salary_ranges.entry_level && (
                            <div className="p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-green-100">
                                <p className="text-sm text-gray-600 mb-1">Entry Level</p>
                                <p className="text-2xl font-bold text-green-700">{career_insights.salary_ranges.entry_level}</p>
                            </div>
                        )}
                        {career_insights.salary_ranges.mid_level && (
                            <div className="p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-green-100">
                                <p className="text-sm text-gray-600 mb-1">Mid Level</p>
                                <p className="text-2xl font-bold text-green-700">{career_insights.salary_ranges.mid_level}</p>
                            </div>
                        )}
                        {career_insights.salary_ranges.senior_level && (
                            <div className="p-4 rounded-lg bg-white/60 backdrop-blur-sm border border-green-100">
                                <p className="text-sm text-gray-600 mb-1">Senior Level</p>
                                <p className="text-2xl font-bold text-green-700">{career_insights.salary_ranges.senior_level}</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Job Market */}
            {career_insights?.job_market && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Job Market Insights
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600">Demand Level</p>
                                <Badge variant={career_insights.job_market.demand === 'High' ? 'default' : 'secondary'}>
                                    {career_insights.job_market.demand}
                                </Badge>
                            </div>
                        </div>
                        {career_insights.job_market.growth_rate && (
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">Growth Rate</p>
                                    <p className="font-semibold text-gray-900">{career_insights.job_market.growth_rate}</p>
                                </div>
                            </div>
                        )}
                        {career_insights.job_market.remote_opportunities && (
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">Remote Opportunities</p>
                                    <p className="font-semibold text-gray-900">{career_insights.job_market.remote_opportunities}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {career_insights.job_market.top_companies && career_insights.job_market.top_companies.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-5 w-5 text-gray-600" />
                                <p className="font-semibold text-gray-900">Top Hiring Companies</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {career_insights.job_market.top_companies.map((company, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        {company}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Interview Prep */}
            {interview_prep && (
                <Card className="p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-200">
                    <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-lg">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                        Interview Preparation
                    </h3>

                    {interview_prep.technical_questions && interview_prep.technical_questions.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Technical Questions</h4>
                            <div className="space-y-2">
                                {interview_prep.technical_questions.slice(0, 5).map((q, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-white/60 text-sm text-gray-700 border border-purple-100">
                                        • {q}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {interview_prep.behavioral_questions && interview_prep.behavioral_questions.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Behavioral Questions</h4>
                            <div className="space-y-2">
                                {interview_prep.behavioral_questions.slice(0, 3).map((q, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-white/60 text-sm text-gray-700 border border-pink-100">
                                        • {q}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {interview_prep.assessment_tips && interview_prep.assessment_tips.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Assessment Tips</h4>
                            <div className="flex flex-wrap gap-2">
                                {interview_prep.assessment_tips.map((tip, idx) => (
                                    <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-800">
                                        {tip}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Networking */}
            {networking && (
                <Card className="p-6 bg-white/60 backdrop-blur-sm border-gray-200">
                    <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4 text-lg">
                        <Users className="h-5 w-5 text-indigo-600" />
                        Networking & Community
                    </h3>

                    {networking.communities && networking.communities.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Communities to Join</h4>
                            <div className="space-y-2">
                                {networking.communities.map((community, idx) => (
                                    <div key={idx} className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/50 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{community.name}</p>
                                                <p className="text-xs text-gray-600">
                                                    {community.platform} {community.members && `• ${community.members}`}
                                                </p>
                                            </div>
                                            {community.url && (
                                                <Badge variant="outline" className="text-xs">Join</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {networking.conferences && networking.conferences.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <h4 className="font-semibold text-gray-900 text-sm">Conferences & Events</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {networking.conferences.map((conf, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                        {conf}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {networking.linkedin_tips && networking.linkedin_tips.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Linkedin className="h-4 w-4 text-blue-600" />
                                <h4 className="font-semibold text-gray-900 text-sm">LinkedIn Optimization</h4>
                            </div>
                            <ul className="space-y-1">
                                {networking.linkedin_tips.map((tip, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                        <span className="text-blue-600">→</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
