"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  Book,
  Clock,
  Target,
  ChevronRight,
  CheckCircle,
  BookOpen,
  Award,
  ArrowRight,
  AlertCircle,
  Download,
  RefreshCw,
  Briefcase,
  GraduationCap,
  ExternalLink,
  BarChart3,
  Lightbulb,
  Code,
  Rocket,
  Edit3,
  PlayCircle
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { savedJobsAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function LearningRoadmapPage() {
  const router = useRouter()
  const roadmapRef = useRef<HTMLDivElement>(null)
  const [roadmap, setRoadmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [customDuration, setCustomDuration] = useState<string>("")
  const [durationUnit, setDurationUnit] = useState<string>("months")
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [generatingCustom, setGeneratingCustom] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<string>("all")

  useEffect(() => {
    fetchRoadmap()
  }, [])

  const fetchRoadmap = async (forceRegenerate = false) => {
    try {
      setLoading(true)
      setError(null)
      // Use the API client which handles base URL and auth tokens correctly
      const params = forceRegenerate ? { force: 'true' } : {}
      const response = await savedJobsAPI.getLearningRoadmap(params)

      console.log('=== ROADMAP DATA ===', response.data.roadmap)
      setRoadmap(response.data.roadmap)
    } catch (err: any) {
      console.error("Roadmap fetch error:", err)
      setError(err.response?.data?.message || "Failed to generate roadmap")
    } finally {
      setLoading(false)
    }
  }

  const generateCustomRoadmap = async () => {
    if (!customDuration || isNaN(Number(customDuration)) || Number(customDuration) <= 0) {
      alert("Please enter a valid duration")
      return
    }

    try {
      setGeneratingCustom(true)
      setError(null)

      let durationInMonths = Number(customDuration)
      if (durationUnit === "weeks") {
        durationInMonths = durationInMonths / 4
      } else if (durationUnit === "years") {
        durationInMonths = durationInMonths * 12
      }

      const response = await savedJobsAPI.getLearningRoadmap()
      const originalRoadmap = response.data.roadmap
      const adjustedRoadmap = adjustRoadmapDuration(originalRoadmap, durationInMonths)

      setRoadmap(adjustedRoadmap)
      setIsEditingDuration(false)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate custom roadmap")
    } finally {
      setGeneratingCustom(false)
    }
  }

  const adjustRoadmapDuration = (originalRoadmap: any, targetMonths: number) => {
    const currentEstimate = originalRoadmap.total_time_estimate || "6-12 months"
    const currentMonths = parseInt(currentEstimate.split('-')[1] || "12")
    const scaleFactor = targetMonths / currentMonths

    return {
      ...originalRoadmap,
      total_time_estimate: `${Math.round(targetMonths * 0.8)}-${Math.round(targetMonths)} ${targetMonths > 12 ? 'months' : 'months'}`,
      learning_phases: originalRoadmap.learning_phases?.map((phase: any) => {
        const phaseDuration = phase.duration || "4 weeks"
        const phaseWeeks = parseInt(phaseDuration.split(' ')[0] || "4")
        const newWeeks = Math.round(phaseWeeks * scaleFactor)

        return {
          ...phase,
          duration: `${newWeeks} weeks`,
          skills: phase.skills?.map((skill: any) => {
            const skillTime = skill.time_estimate || "2 weeks"
            const skillWeeks = parseInt(skillTime.split(' ')[0] || "2")
            const newSkillWeeks = Math.max(1, Math.round(skillWeeks * scaleFactor))

            return {
              ...skill,
              time_estimate: `${newSkillWeeks} ${newSkillWeeks === 1 ? 'week' : 'weeks'}`
            }
          })
        }
      })
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('programming') || cat.includes('language')) return Code;
    if (cat.includes('framework') || cat.includes('library')) return Lightbulb;
    if (cat.includes('tool') || cat.includes('devops')) return Rocket;
    if (cat.includes('database')) return BarChart3;
    return Book;
  }

  const downloadAsText = () => {
    if (!roadmap) return;

    let content = `
╔════════════════════════════════════════════════════════════════╗
║              PERSONALIZED LEARNING ROADMAP                      ║
║              Generated on ${new Date().toLocaleDateString()}                        ║
╚════════════════════════════════════════════════════════════════╝

EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════════
${roadmap.summary || 'No summary available'}

ROADMAP OVERVIEW
═══════════════════════════════════════════════════════════════════
→ Total Skills Required: ${roadmap.total_skills_needed || 0}
→ Estimated Duration: ${roadmap.total_time_estimate || 'Not specified'}
→ Learning Phases: ${roadmap.learning_phases?.length || 0}
→ Career Paths Available: ${roadmap.career_paths?.length || 0}
`;

    if (roadmap.skill_gap_analysis) {
      content += `\nSKILL GAP ANALYSIS\n═══════════════════════════════════════════════════════════════════\n`;

      if (roadmap.skill_gap_analysis.new_skills_needed?.length > 0) {
        content += `\n📌 NEW SKILLS TO LEARN (${roadmap.skill_gap_analysis.new_skills_needed.length}):\n`;
        roadmap.skill_gap_analysis.new_skills_needed.forEach((skill: string, idx: number) => {
          content += `   ${idx + 1}. ${skill}\n`;
        });
      }

      if (roadmap.skill_gap_analysis.skills_to_upgrade?.length > 0) {
        content += `\n📈 SKILLS TO UPGRADE (${roadmap.skill_gap_analysis.skills_to_upgrade.length}):\n`;
        roadmap.skill_gap_analysis.skills_to_upgrade.forEach((item: any, idx: number) => {
          content += `   ${idx + 1}. ${item.skill}: ${item.current_level} → ${item.target_level}\n`;
        });
      }

      if (roadmap.skill_gap_analysis.skills_already_sufficient?.length > 0) {
        content += `\n✓ SKILLS ALREADY SUFFICIENT (${roadmap.skill_gap_analysis.skills_already_sufficient.length}):\n`;
        roadmap.skill_gap_analysis.skills_already_sufficient.forEach((skill: string, idx: number) => {
          content += `   ${idx + 1}. ${skill}\n`;
        });
      }
    }

    if (roadmap.career_paths?.length > 0) {
      content += `\n\nCAREER OPPORTUNITIES\n═══════════════════════════════════════════════════════════════════\n`;
      roadmap.career_paths.forEach((path: any, idx: number) => {
        content += `\n${idx + 1}. ${path.role}\n`;
        content += `   Readiness: ${path.readiness_percentage || 'N/A'}%\n`;
        content += `   Required Phases: ${path.required_phases?.join(', ') || 'All phases'}\n`;
      });
    }

    if (roadmap.learning_phases?.length > 0) {
      content += `\n\nLEARNING PHASES - DETAILED BREAKDOWN\n═══════════════════════════════════════════════════════════════════\n`;

      roadmap.learning_phases.forEach((phase: any) => {
        content += `\n${'═'.repeat(67)}\n`;
        content += `PHASE ${phase.phase}: ${phase.title.toUpperCase()}\n`;
        content += `${'═'.repeat(67)}\n`;
        content += `Duration: ${phase.duration}\n`;
        content += `Description: ${phase.description}\n\n`;

        phase.skills?.forEach((skill: any, skillIdx: number) => {
          content += `${skillIdx + 1}. ${skill.skill}\n`;
          content += `   ├─ Type: ${skill.skill_type === 'new' ? 'New Skill' : 'Upgrade Existing'}\n`;
          content += `   ├─ Category: ${skill.category || 'General'}\n`;
          content += `   ├─ Difficulty: ${skill.difficulty}\n`;
          content += `   ├─ Time Required: ${skill.time_estimate}\n`;
          if (skill.learning_path) {
            content += `   ├─ Learning Path: ${skill.learning_path}\n`;
          }
          if (skill.resources?.length > 0) {
            content += `   └─ Resources: ${skill.resources.join(', ')}\n`;
          }
          content += `\n`;
        });
      });
    }

    content += `\n${'═'.repeat(67)}\nGenerated by IIUC Career Platform\n${'═'.repeat(67)}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-roadmap-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      downloadAsText();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#14b8a6] mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Generating your personalized learning roadmap...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !roadmap) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <Card className="p-12 text-center">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roadmap Available</h3>
            <p className="text-sm text-gray-600 mb-6">
              {error || "Add jobs to your interested list to generate a learning roadmap"}
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
    <div className="min-h-screen bg-white">
      <main ref={roadmapRef} className="max-w-[1400px] mx-auto px-12 py-10">
        {/* Professional Header */}
        <div className="mb-12 border-b pb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-12 w-12 bg-gradient-to-br from-[#14b8a6] to-[#0d9488] rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Personalized Learning Roadmap</h1>
                  <p className="text-sm text-gray-500 mt-1">AI-Generated Career Development Plan</p>
                </div>
              </div>
              <p className="text-base text-gray-600 max-w-3xl leading-relaxed">
                Your customized learning path based on career goals, current skills, and target positions.
                Follow this structured plan to systematically acquire the competencies required for your desired roles.
              </p>
            </div>
            <div className="flex flex-col space-y-3 ml-8">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] hover:from-[#5330d4] hover:to-teal-700 text-white shadow-lg h-11 px-6"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Preparing...' : 'Download Roadmap'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Clear local cache when force refreshing
                  localStorage.removeItem('candidate_roadmap');
                  localStorage.removeItem('candidate_courses');
                  fetchRoadmap(true);
                }}
                className="border-2 border-gray-300 hover:border-[#14b8a6] hover:bg-teal-50 h-11 px-6"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Custom Duration Editor */}
        <Card className="mb-8 border-2 border-teal-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Customize Learning Duration</h3>
                  <p className="text-xs text-teal-100">Adjust the roadmap to fit your timeline</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDuration(!isEditingDuration)}
                className="text-white hover:bg-white/20 border border-white/30"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditingDuration ? 'Cancel' : 'Edit Duration'}
              </Button>
            </div>
          </div>

          {isEditingDuration && (
            <div className="p-6 bg-gradient-to-br from-teal-50 to-white">
              <div className="max-w-2xl">
                <p className="text-sm text-gray-600 mb-4">
                  Set your preferred learning timeframe, and we'll adjust the roadmap phases and skill timelines accordingly.
                </p>
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="duration" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Target Duration
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      placeholder="Enter duration"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="h-11 text-lg"
                    />
                  </div>
                  <div className="w-40">
                    <Label htmlFor="unit" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Time Unit
                    </Label>
                    <select
                      id="unit"
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      className="w-full h-11 px-3 border-2 border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent"
                    >
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  <Button
                    onClick={generateCustomRoadmap}
                    disabled={generatingCustom || !customDuration}
                    className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] hover:from-[#5330d4] hover:to-teal-700 text-white h-11 px-6 shadow-lg"
                  >
                    {generatingCustom ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Apply & Generate
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-teal-100 border border-teal-200 rounded-lg">
                  <p className="text-xs text-teal-800">
                    <strong>Tip:</strong> A realistic timeframe for most career transitions is 6-12 months with consistent daily learning.
                    Shorter durations require intensive study, while longer periods allow for more gradual progress.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <Card className="p-6 border-2 border-gray-200 hover:border-[#14b8a6] transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-[#14b8a6]" />
              </div>
              <span className="text-3xl font-bold text-[#14b8a6]">{roadmap.total_skills_needed || 0}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Total Skills</h3>
            <p className="text-xs text-gray-500">Required competencies</p>
          </Card>

          <Card className="p-6 border-2 border-gray-200 hover:border-teal-500 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-teal-600" />
              </div>
              <span className="text-3xl font-bold text-teal-600">
                {roadmap.total_time_estimate?.split('-')[0] || 'N/A'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Duration</h3>
            <p className="text-xs text-gray-500">{roadmap.total_time_estimate || 'Estimated time'}</p>
          </Card>

          <Card className="p-6 border-2 border-gray-200 hover:border-green-500 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-3xl font-bold text-green-600">{roadmap.learning_phases?.length || 0}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Learning Phases</h3>
            <p className="text-xs text-gray-500">Structured modules</p>
          </Card>

          <Card className="p-6 border-2 border-gray-200 hover:border-orange-500 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-3xl font-bold text-orange-600">{roadmap.career_paths?.length || 0}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Career Paths</h3>
            <p className="text-xs text-gray-500">Target positions</p>
          </Card>
        </div>

        {/* Executive Summary */}
        {roadmap.summary && (
          <Card className="mb-12 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <div className="p-8">
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 bg-[#14b8a6] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Book className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Executive Summary</h2>
                  <p className="text-base text-gray-700 leading-relaxed">{roadmap.summary}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Skill Gap Analysis */}
        {roadmap.skill_gap_analysis && (
          <Card className="mb-12 border-2 border-orange-200">
            <div className="bg-gradient-to-r from-orange-50 to-white p-8 border-b">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Skill Gap Analysis</h2>
                  <p className="text-sm text-gray-600">Current state vs. target requirements</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-3 gap-6">
                {/* New Skills */}
                {roadmap.skill_gap_analysis.new_skills_needed && roadmap.skill_gap_analysis.new_skills_needed.length > 0 && (
                  <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                    <div className="flex items-center space-x-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <h3 className="text-base font-bold text-red-900">
                        New Skills Needed ({roadmap.skill_gap_analysis.new_skills_needed.length})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {roadmap.skill_gap_analysis.new_skills_needed.map((skill: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2 text-sm">
                          <ChevronRight className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-800">{skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills to Upgrade */}
                {roadmap.skill_gap_analysis.skills_to_upgrade && roadmap.skill_gap_analysis.skills_to_upgrade.length > 0 && (
                  <div className="border-2 border-yellow-200 rounded-lg p-6 bg-yellow-50">
                    <div className="flex items-center space-x-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                      <h3 className="text-base font-bold text-yellow-900">
                        Skills to Upgrade ({roadmap.skill_gap_analysis.skills_to_upgrade.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {roadmap.skill_gap_analysis.skills_to_upgrade.map((item: any, idx: number) => (
                        <div key={idx} className="text-sm bg-white rounded p-2 border border-yellow-200">
                          <div className="font-semibold text-gray-900 mb-1">{item.skill}</div>
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="text-yellow-700">{item.current_level}</span>
                            <ArrowRight className="h-3 w-3 mx-2" />
                            <span className="text-green-700 font-semibold">{item.target_level}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Already Sufficient */}
                {roadmap.skill_gap_analysis.skills_already_sufficient && roadmap.skill_gap_analysis.skills_already_sufficient.length > 0 && (
                  <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                    <div className="flex items-center space-x-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="text-base font-bold text-green-900">
                        Already Sufficient ({roadmap.skill_gap_analysis.skills_already_sufficient.length})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {roadmap.skill_gap_analysis.skills_already_sufficient.map((skill: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-800">{skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Career Opportunities */}
        {roadmap.career_paths && roadmap.career_paths.length > 0 && (
          <Card className="mb-12 border-2 border-teal-200">
            <div className="bg-gradient-to-r from-teal-50 to-white p-8 border-b">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-teal-600 rounded-lg flex items-center justify-center">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Career Opportunities</h2>
                  <p className="text-sm text-gray-600">Target positions aligned with your learning path</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {roadmap.career_paths.map((path: any, index: number) => (
                  <div key={index} className="border-2 border-gray-200 rounded-lg p-6 hover:border-teal-500 hover:shadow-lg transition-all bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-teal-600" />
                      </div>
                      <Badge className="bg-gradient-to-r from-teal-600 to-teal-700 text-white border-0 px-3 py-1">
                        {path.readiness_percentage || 'N/A'}%
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-4">{path.role}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <Target className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-gray-500 font-medium">Required Phases:</span>
                          <span className="ml-2 text-gray-700">{path.required_phases?.join(', ') || 'All'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* When to Apply Section */}
        <Card className="mb-12 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="p-8">
            <div className="flex items-start space-x-4">
              <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-3">When to Start Applying</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white border-2 border-green-200 rounded-lg p-5">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-700">1</span>
                      </div>
                      <h3 className="font-bold text-gray-900">Internships</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">After Phase {Math.ceil((roadmap.learning_phases?.length || 2) / 2)}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Once you have foundational skills, start applying for internships to gain practical experience
                    </p>
                  </div>

                  <div className="bg-white border-2 border-green-200 rounded-lg p-5">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="h-8 w-8 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-teal-700">2</span>
                      </div>
                      <h3 className="font-bold text-gray-900">Junior Roles</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">After Phase {(roadmap.learning_phases?.length || 3) - 1}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      With most skills acquired, target junior developer positions for full-time opportunities
                    </p>
                  </div>

                  <div className="bg-white border-2 border-green-200 rounded-lg p-5">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="h-8 w-8 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-teal-700">3</span>
                      </div>
                      <h3 className="font-bold text-gray-900">Mid-Level</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">After All Phases</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      With comprehensive skills and portfolio, apply for mid-level and specialized positions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 bg-gradient-to-br from-[#14b8a6] to-[#0d9488] rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Detailed Learning Phases</h2>
              <p className="text-sm text-gray-600">Step-by-step progression with resources and projects</p>
            </div>
          </div>
        </div>

        {/* Level Tabs */}
        <Tabs defaultValue="all" className="w-full mb-8" onValueChange={setSelectedLevel}>
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-teal-50 p-1 rounded-lg">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#14b8a6] data-[state=active]:to-[#0d9488] data-[state=active]:text-white"
            >
              All Levels
            </TabsTrigger>
            <TabsTrigger
              value="beginner"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              Beginner
            </TabsTrigger>
            <TabsTrigger
              value="intermediate"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-orange-600 data-[state=active]:text-white"
            >
              Intermediate
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white"
            >
              Pro / Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedLevel} className="mt-0">
            <div className="space-y-8">
              {roadmap.learning_phases && roadmap.learning_phases.map((phase: any, phaseIndex: number) => {
                // Filter skills by selected level
                const filteredSkills = selectedLevel === "all"
                  ? phase.skills
                  : phase.skills?.filter((skill: any) =>
                    skill.difficulty?.toLowerCase() === selectedLevel.toLowerCase()
                  );

                // Skip phase if no skills match the filter
                if (!filteredSkills || filteredSkills.length === 0) return null;

                const IconComponent = getCategoryIcon('phase');

                return (
                  <div key={phase.phase} className="relative">
                    {/* Timeline Connector */}
                    {phaseIndex < roadmap.learning_phases.length - 1 && (
                      <div className="absolute left-8 top-full h-8 w-1 bg-gradient-to-b from-[#14b8a6] to-[#0d9488] z-0"></div>
                    )}

                    <Card className="relative z-10 border-2 border-gray-200 overflow-hidden hover:border-[#14b8a6] transition-all">
                      {/* Phase Header */}
                      <div className="bg-gradient-to-r from-[#14b8a6] via-teal-600 to-teal-700 p-8 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6 flex-1">
                            <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
                              <span className="text-3xl font-bold">{phase.phase}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-2xl font-bold">{phase.title}</h3>
                                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
                                  <Clock className="h-3 w-3 mr-1 inline" />
                                  {phase.duration}
                                </Badge>
                              </div>
                              <p className="text-teal-100 text-base leading-relaxed">{phase.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-teal-100 mb-1">Phase {phase.phase} of {roadmap.learning_phases.length}</div>
                            <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${(phase.phase / roadmap.learning_phases.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skills Grid */}
                      <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {phase.skills && phase.skills.map((skill: any, skillIndex: number) => {
                            const SkillIcon = getCategoryIcon(skill.category || '');

                            return (
                              <Card key={skillIndex} className="p-6 border-2 border-gray-200 hover:border-[#14b8a6] hover:shadow-xl transition-all bg-white">
                                <div className="space-y-4">
                                  {/* Skill Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 flex-1">
                                      <div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <SkillIcon className="h-5 w-5 text-[#14b8a6]" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-bold text-lg text-gray-900 leading-tight mb-1">{skill.skill || skill.name || `Skill ${skillIndex + 1}`}</h4>
                                        {skill.category && <Badge variant="outline" className="text-xs">{skill.category}</Badge>}
                                      </div>
                                    </div>
                                    {skill.difficulty && (
                                      <Badge className={cn("text-xs font-medium ml-2", getDifficultyColor(skill.difficulty))}>
                                        {skill.difficulty}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Skill Type and Levels */}
                                  <div className="space-y-2">
                                    {skill.skill_type && (
                                      <div className="flex items-center space-x-2">
                                        <Badge
                                          className={cn(
                                            "text-xs",
                                            skill.skill_type === 'new'
                                              ? "bg-red-100 text-red-700 border-red-300"
                                              : "bg-yellow-100 text-yellow-700 border-yellow-300"
                                          )}
                                        >
                                          {skill.skill_type === 'new' ? 'New Skill' : 'Upgrade Required'}
                                        </Badge>
                                        {skill.time_estimate && (
                                          <div className="flex items-center text-xs text-gray-600">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {skill.time_estimate}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {skill.skill_type === 'upgrade' && skill.current_level && skill.target_level && (
                                      <div className="bg-gradient-to-r from-yellow-50 to-green-50 border-2 border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-yellow-700 font-semibold">{skill.current_level}</span>
                                          <ArrowRight className="h-4 w-4 text-gray-400" />
                                          <span className="text-green-700 font-bold">{skill.target_level}</span>
                                        </div>
                                      </div>
                                    )}

                                    {skill.skill_type === 'new' && skill.target_level && (
                                      <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-3">
                                        <div className="text-sm">
                                          <span className="text-gray-700">Target Level: </span>
                                          <span className="text-teal-700 font-bold">{skill.target_level}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Gap Addressed */}
                                  {skill.gap_addressed && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                      <div className="flex items-start space-x-2">
                                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <span className="text-xs font-semibold text-orange-900 block mb-1">Addresses Gap:</span>
                                          <span className="text-xs text-gray-700">{skill.gap_addressed}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Learning Path */}
                                  {/* Learning Path */}
                                  {skill.learning_path && (
                                    <div className="border-t pt-3">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Learning Path:</h5>
                                      {typeof skill.learning_path === 'string' ? (
                                        <p className="text-sm text-gray-600 leading-relaxed">{skill.learning_path}</p>
                                      ) : (
                                        <div className="space-y-3">
                                          {skill.learning_path.steps && skill.learning_path.steps.map((step: any, sIdx: number) => (
                                            <div key={sIdx} className="bg-gray-50 rounded p-2 text-xs border border-gray-100">
                                              <div className="flex justify-between font-semibold text-gray-800 mb-1">
                                                <span>{sIdx + 1}. {step.title}</span>
                                                <span className="text-gray-500">{step.duration}</span>
                                              </div>
                                              <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                                                {step.objectives && step.objectives.map((obj: string, oIdx: number) => (
                                                  <li key={oIdx}>{obj}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Resources */}
                                  {skill.resources && skill.resources.length > 0 && (
                                    <div className="border-t pt-3">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Recommended Resources:
                                      </h5>
                                      <div className="space-y-1.5">
                                        {skill.resources.map((resource: string, idx: number) => (
                                          <div key={idx} className="flex items-start space-x-2 text-xs">
                                            <ChevronRight className="h-3 w-3 text-teal-600 mt-0.5 flex-shrink-0" />
                                            <span className="text-gray-700">{resource}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Unlocks */}
                                  {skill.unlocks && skill.unlocks.length > 0 && (
                                    <div className="bg-gradient-to-r from-teal-50 to-teal-50 border border-teal-200 rounded-lg p-3">
                                      <div className="flex items-start space-x-2">
                                        <ArrowRight className="h-4 w-4 text-[#14b8a6] mt-0.5 flex-shrink-0" />
                                        <div>
                                          <span className="text-xs font-semibold text-teal-900 block mb-1">Unlocks Next:</span>
                                          <span className="text-xs text-gray-700">{skill.unlocks.join(', ')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Phase Project Ideas */}
                        <Card className="mt-6 bg-gradient-to-br from-teal-50 to-teal-50 border-2 border-teal-200">
                          <div className="p-6">
                            <div className="flex items-center space-x-2 mb-4">
                              <Code className="h-5 w-5 text-teal-600" />
                              <h4 className="font-bold text-gray-900">Suggested Projects for Phase {phase.phase}</h4>
                            </div>
                            <div className="space-y-3">
                              {phaseIndex === 0 && (
                                <>
                                  <ProjectIdea
                                    title="Personal Portfolio Website"
                                    description="Build a responsive portfolio to showcase your projects and skills"
                                  />
                                  <ProjectIdea
                                    title="Task Management App"
                                    description="Create a todo list application with CRUD operations"
                                  />
                                  <ProjectIdea
                                    title="Calculator or Converter Tool"
                                    description="Develop a functional calculator or unit converter"
                                  />
                                </>
                              )}
                              {phaseIndex === 1 && (
                                <>
                                  <ProjectIdea
                                    title="Full-Stack Blog Platform"
                                    description="Build a blogging system with authentication and database"
                                  />
                                  <ProjectIdea
                                    title="E-commerce Product Catalog"
                                    description="Create a product listing site with search and filters"
                                  />
                                  <ProjectIdea
                                    title="REST API with Authentication"
                                    description="Develop a backend API with JWT authentication"
                                  />
                                </>
                              )}
                              {phaseIndex >= 2 && (
                                <>
                                  <ProjectIdea
                                    title="Real-time Chat Application"
                                    description="Build a messaging app with WebSocket support"
                                  />
                                  <ProjectIdea
                                    title="Analytics Dashboard"
                                    description="Create a data visualization dashboard with charts"
                                  />
                                  <ProjectIdea
                                    title="Progressive Web App"
                                    description="Develop a mobile-responsive PWA with offline support"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom Actions */}
        <Card className="border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-teal-50">
          <div className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Begin Your Journey?</h3>
                <p className="text-sm text-gray-600">Update your profile, explore opportunities, and start learning</p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/candidate/profile/skills')}
                  className="border-2 border-gray-300 hover:border-[#14b8a6] hover:bg-teal-50"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Update Skills
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/candidate/interested-jobs')}
                  className="border-2 border-gray-300 hover:border-teal-600 hover:bg-teal-50"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Manage Jobs
                </Button>
                <Button
                  onClick={() => router.push('/candidate/courses')}
                  className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] hover:from-[#5330d4] hover:to-teal-700 text-white"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </main >
    </div >
  )
}

// Helper component for project ideas
function ProjectIdea({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-teal-200 hover:border-teal-400 transition-all">
      <ChevronRight className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
      <div>
        <h5 className="font-semibold text-sm text-gray-900">{title}</h5>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
  )
}
