"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, Clock, Send, Video, Check, Sparkles, Bot, FileText, Upload } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface InterviewSchedulerCardProps {
  candidateName: string
  jobTitle: string
  onSchedule: (dateTime: Date) => void
  onJoinMeeting: () => void
  onAssignAI: (data: { topic: string; file?: File; questionCount: number }) => void
  isScheduling: boolean
  hasScheduledInterview: boolean
  scheduledDateTime?: Date
  meetingLink?: string
}

export function InterviewSchedulerCard({
  candidateName,
  jobTitle,
  onSchedule,
  onJoinMeeting,
  onAssignAI,
  isScheduling,
  hasScheduledInterview,
  scheduledDateTime,
  meetingLink,
}: InterviewSchedulerCardProps) {
  const [date, setDate] = useState<Date | undefined>(scheduledDateTime || new Date())
  const [time, setTime] = useState<string>(scheduledDateTime ? format(scheduledDateTime, 'HH:mm') : '10:00')
  const [activeTab, setActiveTab] = useState("video")

  // AI Assignment State
  const [topic, setTopic] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [questionCount, setQuestionCount] = useState(5)

  const handleScheduleClick = () => {
    if (activeTab === "video") {
      if (date && time) {
        const [hours, minutes] = time.split(':').map(Number)
        const combinedDateTime = new Date(date)
        combinedDateTime.setHours(hours, minutes)
        onSchedule(combinedDateTime)
      }
    } else {
      // AI Assignment
      onAssignAI({ topic, file: file || undefined, questionCount })
    }
  }

  return (
    <Card className="w-full shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-0 pt-6 px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-teal-600" />
              Interview Scheduler
            </CardTitle>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Manage interviews for {candidateName}
            </p>
          </div>
          {hasScheduledInterview && (
            <div className="bg-emerald-100/50 rounded-full p-2 border border-emerald-200">
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
          )}
        </div>

        <Tabs defaultValue="video" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="video" className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm font-semibold">
              <Video className="w-4 h-4 mr-2" />
              Live Video
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm font-semibold">
              <Bot className="w-4 h-4 mr-2" />
              AI Assignment
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {activeTab === "video" ? (
          <div className="space-y-6">
            {/* Status Indicator */}
            {hasScheduledInterview && scheduledDateTime ? (
              <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm ring-1 ring-emerald-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    Confirmed
                  </span>
                </div>
                <div className="space-y-1 pl-4 border-l-2 border-emerald-100">
                  <p className="text-sm font-bold text-slate-900">
                    {format(scheduledDateTime, "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    at {format(scheduledDateTime, "h:mm a")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-bold text-slate-700">Pro Tip</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Scheduling will automatically send a Google Calendar invite and Jitsi video link to the candidate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-semibold h-11 border-slate-200 hover:border-teal-500 hover:ring-1 hover:ring-teal-500/20 transition-all",
                        !date && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
                      {date ? format(date, "MMM dd, yyyy") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-xl border-slate-100" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(day: Date) => day < new Date(new Date().setDate(new Date().getDate() - 1))}
                      className="rounded-xl border border-slate-100"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Time
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pl-10 h-11 border-slate-200 hover:border-teal-500 focus:border-teal-500 focus:ring-teal-500/20 font-semibold transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs font-bold text-purple-700">AI Interview</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Upload a PDF or set a topic. AI will generate questions and interview the candidate automatically.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Interview Topic / Context</Label>
              <Input
                placeholder="e.g. React.js Advanced Patterns"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Upload Context (PDF)</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all bg-slate-50/50">
                <Input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  id="pdf-upload"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="pdf-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-600">
                    {file ? file.name : "Click to upload PDF"}
                  </span>
                  {!file && <span className="text-xs text-slate-400 mt-1">Job description or technical docs</span>}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Number of Questions: {questionCount}</Label>
              <Input
                type="range" min="3" max="10" step="1"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="accent-purple-600 cursor-pointer"
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-6 pt-0 bg-slate-50/50 border-t border-slate-100 mt-auto">
        <div className="w-full pt-6 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {activeTab === "video" ? (
              <>
                <Button
                  onClick={handleScheduleClick}
                  disabled={!date || !time || isScheduling}
                  className={cn(
                    "w-full h-11 shadow-lg font-bold transition-all transform active:scale-95",
                    hasScheduledInterview
                      ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                      : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                  )}
                >
                  {isScheduling ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      {hasScheduledInterview ? 'Updating...' : 'Scheduling...'}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {hasScheduledInterview ? 'Reschedule Interview' : 'Send Invite'}
                    </>
                  )}
                </Button>

                {hasScheduledInterview && (
                  <Button
                    onClick={onJoinMeeting}
                    variant="outline"
                    className="w-full h-11 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Join Meeting Now
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={handleScheduleClick}
                disabled={isScheduling || (!topic && !file)}
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 font-bold"
              >
                {isScheduling ? (
                  <>
                    <Bot className="mr-2 h-4 w-4 animate-spin" />
                    Generating Interview...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Assign AI Interview
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
