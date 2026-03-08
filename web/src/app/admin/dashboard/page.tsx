"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { adminAPI } from "@/lib/api"
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Target, 
  Building2, 
  Activity, 
  Sparkles,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Calendar,
  LogOut,
  Award,
  Zap
} from "lucide-react"

interface DashboardData {
  usersAnalyzed: number
  totalCandidates: number
  totalRecruiters: number
  jobsSuggested: number
  totalJobs: number
  activeJobs: number
  skillsMostInDemand: Array<{ skill: string; count: number }>
  commonGaps: Array<{ skill: string; count: number }>
  averageAnalysisScore: number
  totalAnalyses: number
}

interface AIInsights {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  trends: string
  focusAreas: string[]
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [period, setPeriod] = useState("30")

  useEffect(() => {
    fetchDashboardData()
    fetchDetailedAnalytics()
  }, [period])

  const fetchDashboardData = async () => {
    try {
      const response = await adminAPI.getDashboardAnalytics()
      setDashboardData(response.data.data)
    } catch (error: any) {
      console.error("Failed to fetch dashboard data:", error)
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push("/auth/login")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedAnalytics = async () => {
    setInsightsLoading(true)
    try {
      const response = await adminAPI.getDetailedAnalytics(period)
      if (response.data.data.aiInsights) {
        setAiInsights(response.data.data.aiInsights)
      }
    } catch (error) {
      console.error("Failed to fetch detailed analytics:", error)
    } finally {
      setInsightsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#633ff3] mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-4">Failed to load dashboard data</p>
          <Button
            onClick={fetchDashboardData}
            className="bg-[#633ff3] hover:bg-[#5330d4] text-white"
          >
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30">
      {/* Modern Header with Gradient */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#633ff3] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Analytics & Insights</p>
              </div>
            </div>
            <Button
              onClick={() => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('user')
                router.push('/auth/login')
              }}
              variant="outline"
              className="border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-semibold text-gray-700">Analytics Period:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#633ff3] focus:border-transparent shadow-sm hover:border-gray-400 transition-colors"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <Badge className="bg-green-100 text-green-700 border-green-200 px-4 py-2">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            System Active
          </Badge>
        </div>

        {/* Main Stats Cards - Updated with Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Users Analyzed */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-full -mr-16 -mt-16"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Users Analyzed</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{dashboardData.usersAnalyzed}</p>
              <p className="text-xs text-gray-500">Candidates with AI analysis</p>
            </div>
          </Card>

          {/* Jobs Suggested */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-full -mr-16 -mt-16"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Jobs Suggested</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{dashboardData.jobsSuggested}</p>
              <p className="text-xs text-gray-500">Total applications</p>
            </div>
          </Card>

          {/* Total Candidates */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-full -mr-16 -mt-16"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#633ff3] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-[#633ff3]" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Candidates</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{dashboardData.totalCandidates}</p>
              <p className="text-xs text-gray-500">Registered candidates</p>
            </div>
          </Card>

          {/* Average Score */}
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-full -mr-16 -mt-16"></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{dashboardData.averageAnalysisScore.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">AI compatibility score</p>
            </div>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="p-5 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalJobs}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-5 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.activeJobs}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-5 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Recruiters</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.totalRecruiters}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Skills and Gaps Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Skills Most in Demand */}
          <Card className="p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#633ff3] to-[#8b5cf6] flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Skills Most in Demand</h2>
              </div>
            </div>
            <div className="space-y-3">
              {dashboardData.skillsMostInDemand.length > 0 ? (
                dashboardData.skillsMostInDemand.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#633ff3] text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {item.skill}
                      </span>
                    </div>
                    <Badge className="bg-[#633ff3] text-white border-0">
                      {item.count} jobs
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </Card>

          {/* Common Gaps */}
          <Card className="p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Common Skill Gaps</h2>
              </div>
            </div>
            <div className="space-y-3">
              {dashboardData.commonGaps.length > 0 ? (
                dashboardData.commonGaps.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 hover:border-orange-200 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {item.skill}
                      </span>
                    </div>
                    <Badge className="bg-orange-500 text-white border-0">
                      {item.count} gaps
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* AI Insights - Enhanced Design */}
        <Card className="p-8 border border-gray-200 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#633ff3] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI-Powered Insights</h2>
                <p className="text-sm text-gray-500">Automated analytics and recommendations</p>
              </div>
            </div>
            {insightsLoading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#633ff3]"></div>
            )}
          </div>

          {aiInsights ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="h-5 w-5 text-[#633ff3]" />
                  <h3 className="text-base font-bold text-gray-900">Summary</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.summary}</p>
              </div>

              {/* Key Findings */}
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="text-base font-bold text-gray-900">Key Findings</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsights.keyFindings.map((finding, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                        <span className="text-green-600 text-xs font-bold">✓</span>
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-900">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsights.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <span className="text-blue-600 text-xs font-bold">{index + 1}</span>
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trends */}
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <h3 className="text-base font-bold text-gray-900">Market Trends</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.trends}</p>
              </div>

              {/* Focus Areas */}
              <div className="p-5 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <h3 className="text-base font-bold text-gray-900">Strategic Focus Areas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiInsights.focusAreas.map((area, index) => (
                    <Badge
                      key={index}
                      className="px-4 py-2 bg-gradient-to-r from-[#633ff3] to-[#8b5cf6] text-white border-0 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">
                {insightsLoading ? "Generating AI insights..." : "No insights available for this period"}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

