"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Github, Globe, Lightbulb, CheckCircle2 } from "lucide-react"

interface PortfolioGuideProps {
    portfolio_guide?: {
        must_include?: string[]
        showcase_tips?: string[]
        github_best_practices?: string[]
    }
}

export function PortfolioGuide({ portfolio_guide }: PortfolioGuideProps) {
    if (!portfolio_guide) return null

    return (
        <Card className="p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-200">
            <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-6 text-xl">
                <Briefcase className="h-6 w-6 text-indigo-600" />
                Portfolio Building Guide
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Must Include */}
                {portfolio_guide.must_include && portfolio_guide.must_include.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 border-b border-indigo-200 pb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Must Include
                        </h4>
                        <ul className="space-y-3">
                            {portfolio_guide.must_include.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-2 rounded-lg border border-indigo-50">
                                    <span className="text-indigo-500 mt-0.5">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Showcase Tips */}
                {portfolio_guide.showcase_tips && portfolio_guide.showcase_tips.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 border-b border-indigo-200 pb-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Showcase Tips
                        </h4>
                        <ul className="space-y-3">
                            {portfolio_guide.showcase_tips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-2 rounded-lg border border-amber-50">
                                    <span className="text-amber-500 mt-0.5">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* GitHub Best Practices */}
                {portfolio_guide.github_best_practices && portfolio_guide.github_best_practices.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 border-b border-indigo-200 pb-2">
                            <Github className="h-4 w-4 text-gray-900" />
                            GitHub Best Practices
                        </h4>
                        <ul className="space-y-3">
                            {portfolio_guide.github_best_practices.map((practice, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-2 rounded-lg border border-gray-100">
                                    <span className="text-gray-900 mt-0.5">•</span>
                                    {practice}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-100 flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Your portfolio is your digital handshake</span>
                </div>
            </div>
        </Card>
    )
}
