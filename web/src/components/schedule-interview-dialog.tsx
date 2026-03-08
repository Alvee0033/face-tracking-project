"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Calendar, Clock, X } from "lucide-react"
import { videoCallAPI } from "@/lib/api"
import { sendScheduledInterviewEmail } from "@/lib/emailService"

interface ScheduleInterviewDialogProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  companyName?: string
  recruiterName?: string
  onScheduled?: () => void
}

export function ScheduleInterviewDialog({
  isOpen,
  onClose,
  conversationId,
  candidateName,
  candidateEmail,
  jobTitle,
  companyName = "Our Company",
  recruiterName,
  onScheduled
}: ScheduleInterviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    title: `Interview for ${jobTitle}`,
    description: ""
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`)
      const scheduledAt = scheduledDateTime.toISOString()

      // Schedule the interview via API
      const response = await videoCallAPI.scheduleInterview({
        conversationId,
        scheduledAt,
        title: formData.title,
        description: formData.description
      })

      // Get the meeting link from response (assuming it returns a channel or ID)
      const channelId = response.data?.videoCall?.channel_name || `int-${conversationId.slice(0, 16)}`
      const meetingLink = `${window.location.origin}/candidate/video-call?channel=${channelId}&recruiterName=${encodeURIComponent(recruiterName || 'Recruiter')}`

      // Format date and time for email
      const interviewDate = scheduledDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      const interviewTime = scheduledDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      // Send email notification to candidate
      try {
        const emailSent = await sendScheduledInterviewEmail({
          candidateName,
          candidateEmail,
          jobTitle,
          companyName,
          recruiterName,
          interviewTitle: formData.title,
          interviewDate,
          interviewTime,
          meetingLink,
          interviewDescription: formData.description
        })

        if (emailSent) {
          console.log('✅ Scheduled interview email sent to:', candidateEmail)
        } else {
          console.warn('⚠️ Email sending failed, but interview was scheduled')
        }
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError)
        // Continue even if email fails - interview is still scheduled
      }

      alert(`Interview scheduled successfully!\n\nThe candidate will receive:\n- In-app notification\n- Email with meeting link and details\n\nMeeting link: ${meetingLink}`)
      onScheduled?.()
      onClose()
      
      // Reset form
      setFormData({
        date: "",
        time: "",
        title: `Interview for ${jobTitle}`,
        description: ""
      })
    } catch (error: any) {
      console.error("Error scheduling interview:", error)
      alert(error.response?.data?.message || "Failed to schedule interview")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Interview</h2>
        <p className="text-gray-600 mb-6">Schedule a video interview with {candidateName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Interview Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Technical Round 1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">
                <Clock className="inline h-4 w-4 mr-1" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Interview agenda, topics to discuss, preparation notes..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
