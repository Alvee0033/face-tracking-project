"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChatBox } from '@/components/chat-box'
import {
  Inbox as InboxIcon,
  MessageSquare,
  Briefcase,
  Building2,
  Clock,
  User,
  Mail,
  Video,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Phone,
  ArrowLeft,
  CheckCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { messagingAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  is_initiated: boolean
  last_message_at: string
  last_message_content: string
  candidate_unread_count: number
  recruiter: {
    id: string
    user_id: string
    profile: {
      full_name: string
      email: string
      profile_picture_url: string
    }
  }
  job: {
    id: string
    job_title: string
    company: string
    department: string
  }
}

export default function CandidateInboxPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await messagingAPI.getCandidateConversations()
      setConversations(response.data.conversations || [])

      // Auto-select first conversation if exists and none selected
      if (response.data.conversations && response.data.conversations.length > 0 && !selectedConversation) {
        setSelectedConversation(response.data.conversations[0])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredConversations = conversations.filter(c =>
    c.recruiter.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.job.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-teal-600 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">Loading your inbox...</h3>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] sm:h-[calc(100vh-theme(spacing.20))] bg-[#F8FAFC] p-4 lg:p-6 overflow-hidden flex flex-col">
      <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Messages</h1>
            <p className="text-slate-500 font-medium">Manage your interview conversations</p>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex min-h-0">
          {/* Sidebar List */}
          <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-[400px] flex-col border-r border-slate-100 bg-white z-10`}>
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-50 flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all duration-200 group relative border border-transparent",
                      selectedConversation?.id === conversation.id
                        ? "bg-teal-50/50 border-teal-100 shadow-sm"
                        : "hover:bg-slate-50 hover:border-slate-100"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-100 bg-white">
                          {conversation.recruiter.profile.profile_picture_url ? (
                            <img
                              src={conversation.recruiter.profile.profile_picture_url}
                              alt={conversation.recruiter.profile.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                              {conversation.recruiter.profile.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {conversation.candidate_unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-teal-600 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">
                              {conversation.candidate_unread_count}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className={cn(
                            "font-semibold text-base truncate",
                            selectedConversation?.id === conversation.id ? "text-slate-900" : "text-slate-700"
                          )}>
                            {conversation.recruiter.profile.full_name}
                          </h3>
                          <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-2">
                            {formatTime(conversation.last_message_at)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 truncate mb-1.5 flex items-center gap-1.5">
                          <Building2 className="w-3 h-3" />
                          {conversation.job.company}
                          <span className="text-slate-300">•</span>
                          {conversation.job.job_title}
                        </p>
                        <p className={cn(
                          "text-sm truncate",
                          selectedConversation?.id === conversation.id ? "text-slate-600" : "text-slate-400",
                          conversation.candidate_unread_count > 0 ? "font-semibold text-slate-900" : ""
                        )}>
                          {conversation.last_message_content || 'Started a conversation'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-stone-50/30 relative`}>
            {selectedConversation ? (
              <>
                {/* Chat Top Bar */}
                <div className="h-[73px] px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between z-10 sticky top-0">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden -ml-2 text-slate-500"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>

                    <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-100 relative">
                      {selectedConversation.recruiter.profile.profile_picture_url ? (
                        <img
                          src={selectedConversation.recruiter.profile.profile_picture_url}
                          alt={selectedConversation.recruiter.profile.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                          {selectedConversation.recruiter.profile.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 leading-none mb-1">
                        {selectedConversation.recruiter.profile.full_name}
                      </h2>
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        Recruiter at <span className="text-teal-600 bg-teal-50 px-1.5 rounded">{selectedConversation.job.company}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        const shortJobId = selectedConversation.job.id.slice(0, 8)
                        const shortConvId = selectedConversation.id.slice(0, 8)
                        const channel = `int-${shortJobId}-${shortConvId}`
                        router.push(`/candidate/video-call?channel=${channel}&recruiterName=${encodeURIComponent(selectedConversation.recruiter.profile.full_name)}`)
                      }}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-700 border-0 shadow-none h-9 rounded-full px-4 text-sm font-semibold"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Video Call
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 relative bg-[#FAFAFA]">
                  {/* Decorative BG pattern */}
                  <div className="absolute inset-0 opacity-[0.03] pattern-grid pointer-events-none"></div>

                  <ChatBox
                    conversationId={selectedConversation.id}
                    isRecruiter={false}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 text-center p-8">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
                  <MessageSquare className="w-10 h-10 text-teal-500/80" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Inbox</h2>
                <p className="text-slate-500 max-w-md mx-auto text-lg">
                  Select a conversation from the list to view messages, schedule interviews, and chat with recruiters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
