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
}

// Cache key generator
const getCacheKey = (conversationId: string) => `chat_messages_${conversationId}`

// Get cached messages
const getCachedMessages = (conversationId: string): Message[] => {
  if (typeof window === 'undefined') return []
  try {
    const cached = localStorage.getItem(getCacheKey(conversationId))
    return cached ? JSON.parse(cached) : []
  } catch (error) {
    console.error('Error reading cached messages:', error)
    return []
  }
}

// Save messages to cache
const setCachedMessages = (conversationId: string, messages: Message[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getCacheKey(conversationId), JSON.stringify(messages))
  } catch (error) {
    console.error('Error caching messages:', error)
  }
}

export function ChatBox({ conversationId, isRecruiter = false, onCallInitiate }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [conversationExists, setConversationExists] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const initialLoadRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (conversationId) {
      // Load from cache immediately for instant display
      const cachedMessages = getCachedMessages(conversationId)
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages)
        lastMessageIdRef.current = cachedMessages[cachedMessages.length - 1]?.id || null
        console.log('📦 Loaded', cachedMessages.length, 'messages from cache')
      }

      // Then fetch fresh messages
      fetchMessages()

      // Set up polling every 3 seconds for new messages only
      pollingIntervalRef.current = setInterval(() => {
        fetchNewMessages()
      }, 3000)
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

  // Initial fetch - gets all messages
  const fetchMessages = async (silent = false) => {
    if (!conversationExists && silent) return

    try {
      if (!silent) {
        setLoading(true)
      }

      const response = await messagingAPI.getMessages(conversationId)
      const fetchedMessages = response.data.messages || []

      setMessages(fetchedMessages)
      setConversationExists(true)

      // Update cache
      setCachedMessages(conversationId, fetchedMessages)

      // Update last message ID
      if (fetchedMessages.length > 0) {
        lastMessageIdRef.current = fetchedMessages[fetchedMessages.length - 1].id
      }

      initialLoadRef.current = true
      console.log('✅ Loaded', fetchedMessages.length, 'messages')

      // Mark unread messages as read
      const unreadMessages = fetchedMessages.filter((msg: Message) =>
        !msg.is_read && msg.sender_type !== (isRecruiter ? 'recruiter' : 'candidate')
      )

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg: Message) => msg.id).filter(Boolean)
        if (messageIds.length > 0) {
          try {
            await messagingAPI.markMessagesAsRead(conversationId, messageIds)
          } catch (error: any) {
            console.error('Error marking messages as read:', error)
          }
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setConversationExists(false)
        if (!silent) {
          console.log('Conversation not found - may not be initialized yet')
        }
      } else {
        if (!silent) {
          console.error('Error fetching messages:', error)
        }
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  // Optimized polling - only fetch if there are new messages
  const fetchNewMessages = async () => {
    if (!conversationExists || !initialLoadRef.current) return

    try {
      const response = await messagingAPI.getMessages(conversationId)
      const fetchedMessages = response.data.messages || []

      // Only update if we have new messages
      if (fetchedMessages.length > messages.length) {
        const newMessages = fetchedMessages.slice(messages.length)
        console.log('🆕 Received', newMessages.length, 'new message(s)')

        setMessages(fetchedMessages)
        setCachedMessages(conversationId, fetchedMessages)

        if (fetchedMessages.length > 0) {
          lastMessageIdRef.current = fetchedMessages[fetchedMessages.length - 1].id
        }

        // Mark new unread messages as read
        const unreadMessages = newMessages.filter((msg: Message) =>
          !msg.is_read && msg.sender_type !== (isRecruiter ? 'recruiter' : 'candidate')
        )

        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map((msg: Message) => msg.id).filter(Boolean)
          if (messageIds.length > 0) {
            try {
              await messagingAPI.markMessagesAsRead(conversationId, messageIds)
            } catch (error: any) {
              console.error('Error marking messages as read:', error)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setConversationExists(false)
      }
      // Silent fail for polling
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

    const updatedMessages = [...messages, optimisticMessage]
    setMessages(updatedMessages)
    setCachedMessages(conversationId, updatedMessages)
    setNewMessage('')

    try {
      setSending(true)
      await messagingAPI.sendMessage(conversationId, {
        content: messageContent,
        message_type: 'text'
      })

      // Fetch to get the real message with proper ID
      await fetchMessages(true)
    } catch (error: any) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      const revertedMessages = messages.filter(m => m.id !== tempId)
      setMessages(revertedMessages)
      setCachedMessages(conversationId, revertedMessages)
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
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#633ff3]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {isRecruiter ? 'Send a message to start the conversation' : 'No messages yet'}
          </div>
        ) : (
          Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-white shadow-sm text-gray-600 text-xs px-4 py-1.5 rounded-full font-medium">
                  {formatDate(dateMessages[0].created_at)}
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message) => {
                const isOwnMessage = isRecruiter
                  ? message.sender_type === 'recruiter'
                  : message.sender_type === 'candidate'

                const isOptimistic = message.id.startsWith('temp-')

                return (
                  <div
                    key={message.id}
                    className={`flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'} message-enter`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm message-transition ${isOwnMessage
                          ? 'bg-[#633ff3] text-white rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                        } ${isOptimistic ? 'opacity-70' : 'opacity-100'}`}
                    >
                      {message.message_type === 'system' ? (
                        <p className="text-xs italic opacity-75">{message.content}</p>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-1.5 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'
                              }`}
                          >
                            {formatTime(message.created_at)}
                            {isOwnMessage && !isOptimistic && message.is_read && (
                              <span className="ml-2">✓✓</span>
                            )}
                            {isOwnMessage && isOptimistic && (
                              <span className="ml-2 animate-pulse">⋯</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1 border-gray-300 focus:border-[#633ff3] focus:ring-[#633ff3]"
          />
          <Button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-[#633ff3] hover:bg-[#5235c7] px-6"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
