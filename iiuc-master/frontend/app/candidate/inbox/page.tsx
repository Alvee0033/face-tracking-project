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
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { messagingAPI } from '@/lib/api'

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

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await messagingAPI.getCandidateConversations()
      setConversations(response.data.conversations || [])

      // Auto-select first conversation if exists
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

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s' }} />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-white border border-teal-100 shadow-xl flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-teal-600 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-emerald-500 rounded-full border-2 border-white animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Loading Inbox...</h3>
            <p className="text-slate-500 animate-pulse">Connecting you with recruiters</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Background Ambience - subtler */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-100/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="container mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col min-h-0"
        >
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
              <InboxIcon className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Inbox</h1>
              <p className="text-xs text-slate-500 font-medium">Manage your interviews</p>
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-12 text-center shadow-xl shadow-teal-900/5 max-w-md w-full">
                <div className="h-20 w-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <MessageSquare className="h-10 w-10 text-teal-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Messages Yet</h3>
                <p className="text-slate-500 mb-6 leading-relaxed text-sm">
                  When a recruiter moves your application to the interview stage, you'll be able to chat with them here.
                </p>
                <Button variant="outline" className="border-teal-100 text-teal-700 hover:bg-teal-50">
                  Check Applications
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-4">
              {/* Conversations List - Width 4/12 */}
              <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-200/50 h-full flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="font-semibold text-slate-800 text-sm">All Conversations</h2>
                    <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{conversations.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border group ${selectedConversation?.id === conversation.id
                          ? 'border-teal-200 bg-teal-50/50 shadow-sm relative overflow-hidden'
                          : 'border-transparent hover:bg-slate-50'
                          }`}
                      >
                        {selectedConversation?.id === conversation.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 px-0.5" />
                        )}
                        <div className="flex items-start gap-3 relative z-10">
                          <div className="relative flex-shrink-0">
                            <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center border border-slate-100 overflow-hidden">
                              {conversation.recruiter.profile.profile_picture_url ? (
                                <img
                                  src={conversation.recruiter.profile.profile_picture_url}
                                  alt={conversation.recruiter.profile.full_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-teal-600">
                                  {conversation.recruiter.profile.full_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            {conversation.candidate_unread_count > 0 && (
                              <div className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-teal-500 rounded-full flex items-center justify-center ring-2 ring-white">
                                <span className="text-[10px] font-bold text-white">
                                  {conversation.candidate_unread_count}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 py-0.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold text-sm truncate ${selectedConversation?.id === conversation.id ? 'text-teal-900' : 'text-slate-800'}`}>
                                {conversation.recruiter.profile.full_name}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 ml-2">
                                {formatTime(conversation.last_message_at)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate mb-1">
                              {conversation.job.job_title} • {conversation.job.company}
                            </p>
                            <p className={`text-xs truncate ${selectedConversation?.id === conversation.id ? 'text-teal-600/80' : 'text-slate-400'}`}>
                              {conversation.last_message_content || 'No messages yet'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Area - Width 8/12 */}
              <div className="lg:col-span-8 flex flex-col h-full min-h-0">
                {selectedConversation ? (
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-200/50 h-full flex flex-col overflow-hidden relative">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-100 bg-white z-10 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center">
                          {selectedConversation.recruiter.profile.profile_picture_url ? (
                            <img
                              src={selectedConversation.recruiter.profile.profile_picture_url}
                              alt={selectedConversation.recruiter.profile.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-teal-600">
                              {selectedConversation.recruiter.profile.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {selectedConversation.recruiter.profile.full_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                            <Briefcase className="h-3 w-3 text-teal-500" />
                            <span>{selectedConversation.job.job_title}</span>
                            <span className="text-slate-300">•</span>
                            <Building2 className="h-3 w-3 text-teal-500" />
                            <span>{selectedConversation.job.company}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          const shortJobId = selectedConversation.job.id.slice(0, 8)
                          const shortConvId = selectedConversation.id.slice(0, 8)
                          const channel = `int-${shortJobId}-${shortConvId}`
                          router.push(`/candidate/video-call?channel=${channel}&recruiterName=${encodeURIComponent(selectedConversation.recruiter.profile.full_name)}`)
                        }}
                        className="bg-white hover:bg-teal-50 text-teal-600 border border-teal-100 shadow-sm rounded-lg"
                      >
                        <Video className="h-4 w-4 mr-2" />
                      </Button>
                    </div>

                    {/* Chat Box - Fills remaining space */}
                    <div className="flex-1 min-h-0 relative">
                      <ChatBox
                        conversationId={selectedConversation.id}
                        isRecruiter={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm h-full flex items-center justify-center p-8 text-center">
                    <div className="max-w-sm">
                      <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="h-10 w-10 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Select a Conversation</h3>
                      <p className="text-slate-500 text-sm">
                        Choose a recruiter from the list on the left to view your message history and continue chatting.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
