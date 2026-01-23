"use client"

import { useState, useEffect } from "react"
import { Check, X, Lock, TrendingUp, BookOpen, Clock, Star, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useSkillMatchCache } from "@/lib/useSkillMatchCache"

interface SkillMatch {
  skill: string
  candidate_level: string
  job_requirement: string
  match_quality: string
}

interface MissingSkill {
  skill: string
  job_requirement: string
  importance: string
}

interface SkillRecommendation {
  skill: string
  learning_path: string
  resources: string[]
  estimated_time: string
  difficulty: string
}

interface SkillMatchingCardProps {
  jobId: string
  onAnalysisComplete?: (analysis: any) => void
}

export function SkillMatchingCard({ jobId, onAnalysisComplete }: SkillMatchingCardProps) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [cacheSource, setCacheSource] = useState<string>("")
  
  const { getCachedAnalysis, setCachedAnalysis } = useSkillMatchCache()

  useEffect(() => {
    if (jobId) {
      analyzeSkills()
    }
  }, [jobId])

  const analyzeSkills = async () => {
    try {
      // 1. Check local cache first (instant load)
      const cachedData = getCachedAnalysis(jobId)
      if (cachedData) {
        console.log(`✅ Using cached analysis for job ${jobId} (instant load)`)
        setAnalysis(cachedData.analysis)
        setIsFromCache(true)
        setCacheSource('client-memory')
        setLoading(false)
        
        if (onAnalysisComplete) {
          onAnalysisComplete(cachedData.analysis)
        }

        // Get recommendations if missing skills exist
        if (cachedData.analysis.missing_skills?.length > 0) {
          await getRecommendations()
        }

        return
      }

      // 2. If not in local cache, show loading and fetch from API
      setLoading(true)
      setError(null)
      setIsFromCache(false)
      setCacheSource("")

      console.log(`🔄 Fetching analysis for job ${jobId}`)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
      const response = await fetch(`${API_URL}/ai/jobs/${jobId}/analyze-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to analyze skills')
      }

      const data = await response.json()
      
      // 3. Store in local cache for instant reload on next visit
      setCachedAnalysis(jobId, data.analysis, {
        cached: data.cached,
        cacheSource: data.cacheSource
      })

      setAnalysis(data.analysis)
      setIsFromCache(data.cached)
      setCacheSource(data.cached ? data.cacheSource : 'fresh_analysis')
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis)
      }

      // Get recommendations for missing skills
      if (data.analysis.missing_skills?.length > 0) {
        await getRecommendations()
      }

    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRecommendations = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const response = await fetch(`${API_URL}/ai/jobs/${jobId}/recommendations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      }
    } catch (err) {
      console.error('Failed to get recommendations:', err)
    }
  }

  const getMatchQualityColor = (quality: string) => {
    switch (quality) {
      case 'exact': return 'text-green-600 bg-green-100'
      case 'similar': return 'text-blue-600 bg-blue-100'
      case 'partial': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100'
      case 'intermediate': return 'text-yellow-600 bg-yellow-100'
      case 'advanced': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#633ff3]"></div>
          <span className="text-sm text-gray-600">Analyzing your skills...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button 
            onClick={analyzeSkills}
            size="sm"
            className="bg-[#633ff3] hover:bg-[#5330d4] text-white"
          >
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (!analysis) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Skill Match Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Skill Match Analysis</h3>
            {isFromCache && (
              <span className="ml-2 text-xs bg-green-100 px-2 py-0.5 rounded border border-green-300">
                ✓ Cached
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-[#633ff3]" />
            <span className="text-2xl font-bold text-[#633ff3]">
              {analysis.match_percentage}%
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-[#633ff3] h-2 rounded-full transition-all duration-500"
            style={{ width: `${analysis.match_percentage}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-gray-600">
              {analysis.matching_skills?.length || 0} Skills Match
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-red-500" />
            <span className="text-gray-600">
              {analysis.missing_skills?.length || 0} Skills Missing
            </span>
          </div>
        </div>
      </Card>

      {/* Matching Skills */}
      {analysis.matching_skills?.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            Your Matching Skills
          </h4>
          <div className="space-y-3">
            {analysis.matching_skills.map((skill: SkillMatch, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-gray-900">{skill.skill}</span>
                  <Badge variant="secondary" className="text-xs">
                    {skill.candidate_level}
                  </Badge>
                </div>
                <Badge 
                  className={cn("text-xs", getMatchQualityColor(skill.match_quality))}
                >
                  {skill.match_quality}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Missing Skills */}
      {analysis.missing_skills?.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Lock className="h-5 w-5 text-red-500 mr-2" />
            Skills You Need to Learn
          </h4>
          <div className="space-y-3">
            {analysis.missing_skills.map((skill: MissingSkill, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-gray-900">{skill.skill}</span>
                  <Badge variant="outline" className="text-xs">
                    {skill.job_requirement}
                  </Badge>
                </div>
                <Badge 
                  className={cn("text-xs", getImportanceColor(skill.importance))}
                >
                  {skill.importance} priority
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Learning Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <BookOpen className="h-5 w-5 text-[#633ff3] mr-2" />
            Learning Recommendations
          </h4>
          <div className="space-y-4">
            {recommendations.map((rec: SkillRecommendation, index: number) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{rec.skill}</h5>
                  <div className="flex space-x-2">
                    <Badge 
                      className={cn("text-xs", getDifficultyColor(rec.difficulty))}
                    >
                      {rec.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {rec.estimated_time}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{rec.learning_path}</p>
                {rec.resources.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">Resources:</span>
                    <div className="flex flex-wrap gap-1">
                      {rec.resources.map((resource, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button 
          onClick={analyzeSkills}
          variant="outline"
          className="flex-1"
        >
          Refresh Analysis
        </Button>
        <Button 
          className="flex-1 bg-[#633ff3] hover:bg-[#5330d4] text-white"
          onClick={() => window.location.href = '/candidate/profile/skills'}
        >
          Update My Skills
        </Button>
      </div>
    </div>
  )
}
