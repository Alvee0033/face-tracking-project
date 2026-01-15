"use client"

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Phone, Send, Loader2 } from 'lucide-react'
import { messagingAPI } from '@/lib/api'

interface Message {
  id: string
  conversation_id: string
  sender_type: 'recruiter' | 'candidate'
  sender_id: string
  message_type: 'text' | 'system'
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface ChatBoxProps {
  conversationId: string
  isRecruiter?: boolean
  onCallInitiate?: () => void
  messageMode?: 'casual' | 'professional'
  onModeChange?: (mode: 'casual' | 'professional') => void
}

export function ChatBox({ conversationId, isRecruiter = false, onCallInitiate, messageMode = 'casual', onModeChange }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [conversationExists, setConversationExists] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (conversationId) {
      fetchMessages()

      // Set up real-time polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        // Check conversationExists state at the time of polling
        // This will be checked inside fetchMessages as well
        fetchMessages(true) // Silent fetch (no loading state)
      }, 2000)
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async (silent = false) => {
    // Don't fetch if conversation doesn't exist (already confirmed as missing)
    if (!conversationExists && silent) {
      return
    }

    try {
      if (!silent) {
        setLoading(true)
      }
      const response = await messagingAPI.getMessages(conversationId)
      setMessages(response.data.messages || [])
      setConversationExists(true)

      // Mark unread messages as read
      const unreadMessages = response.data.messages?.filter((msg: Message) =>
        !msg.is_read && msg.sender_type !== (isRecruiter ? 'recruiter' : 'candidate')
      )

      if (unreadMessages && unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg: Message) => msg.id).filter(Boolean)

        // Only mark as read if we have valid message IDs
        if (messageIds.length > 0) {
          try {
            await messagingAPI.markMessagesAsRead(conversationId, messageIds)
          } catch (error: any) {
            console.error('Error marking messages as read:', error)
            // Don't throw - this is not critical for the user experience
          }
        }
      }
    } catch (error: any) {
      // If conversation doesn't exist (404), mark it and stop polling
      if (error.response?.status === 404) {
        setConversationExists(false)
        // Only log 404 errors if not silent (initial load)
        if (!silent) {
          console.log('Conversation not found - may not be initialized yet')
        }
      } else {
        // Log other errors
        if (!silent) {
          console.error('Error fetching messages:', error)
          console.error('Failed to load messages. Please try again.')
        }
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    // Check if conversation exists before sending
    if (!conversationExists) {
      alert('Conversation not initialized. Please try refreshing the page.')
      return
    }

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_type: isRecruiter ? 'recruiter' : 'candidate',
      sender_id: 'current-user',
      message_type: 'text',
      content: messageContent,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      setSending(true)
      await messagingAPI.sendMessage(conversationId, {
        content: messageContent,
        message_type: 'text'
      })

      // Silently fetch to get the real message with proper ID
      await fetchMessages(true)
    } catch (error: any) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(messageContent) // Restore the message

      if (error.response?.status === 404) {
        alert('Conversation not found. Please refresh the page and try again.')
        setConversationExists(false)
      } else {
        alert(error.response?.data?.message || 'Failed to send message')
      }
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {}

    messages.forEach(message => {
      const dateKey = new Date(message.created_at).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate()

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-400 z-10" />

      {/* Mode Toggle Header - Only show for recruiters */}
      {isRecruiter && onModeChange && (
        <div className="p-3 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Message Mode</span>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => onModeChange('casual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${messageMode === 'casual'
                  ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Casual
              </button>
              <button
                onClick={() => onModeChange('professional')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${messageMode === 'professional'
                  ? 'bg-white text-purple-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Professional
              </button>
            </div>
          </div>
          {messageMode === 'professional' && (
            <div className="flex items-center gap-1.5 mt-2 bg-purple-50 text-purple-700 p-2 rounded-lg border border-purple-100">
              <span className="text-[10px] font-medium">Professional mode: One-way communication enabled.</span>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500 opacity-50" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Send className="w-6 h-6 text-slate-300 ml-1" />
            </div>
            <p className="text-sm font-medium">
              {isRecruiter ? 'Start the conversation...' : 'No messages yet'}
            </p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
            <div key={dateKey} className="space-y-6">
              {/* Date Separator */}
              <div className="flex items-center justify-center">
                <div className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  {formatDate(dateMessages[0].created_at)}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-4">
                {dateMessages.map((message) => {
                  const isOwnMessage = isRecruiter
                    ? message.sender_type === 'recruiter'
                    : message.sender_type === 'candidate'

                  const isOptimistic = message.id.startsWith('temp-')

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 shadow-sm transition-all duration-200 text-sm leading-relaxed ${isOwnMessage
                          ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl rounded-tr-sm '
                          : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'
                          } ${isOptimistic ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'}`}
                      >
                        {message.message_type === 'system' ? (
                          <p className="text-xs italic opacity-75">{message.content}</p>
                        ) : (
                          <div className="relative">
                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] font-medium ${isOwnMessage ? 'text-teal-100' : 'text-slate-400'}`}>
                              {formatTime(message.created_at)}
                              {isOwnMessage && !isOptimistic && message.is_read && (
                                <span title="Read">✓✓</span>
                              )}
                              {isOwnMessage && !isOptimistic && !message.is_read && (
                                <span title="Sent">✓</span>
                              )}
                              {isOwnMessage && isOptimistic && (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Message Input - Conditional based on mode and user role */}
      {(messageMode === 'casual' || isRecruiter) ? (
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-teal-100 focus-within:border-teal-400 transition-all p-1">
              <Input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                className="border-0 bg-transparent focus-visible:ring-0 placeholder:text-slate-400 text-slate-700 px-3 py-2 h-auto max-h-32"
              />
            </div>
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className={`h-11 w-11 rounded-xl shrink-0 transition-transform active:scale-95 ${!newMessage.trim() ? 'bg-teal-50 text-teal-300 hover:bg-teal-100 border border-teal-100' : 'bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/20'
                }`}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 font-medium flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Professional mode is active
          </p>
          <p className="text-xs text-slate-400 mt-1">Only the recruiter can send messages right now.</p>
        </div>
      )}
    </div>
  )
}
