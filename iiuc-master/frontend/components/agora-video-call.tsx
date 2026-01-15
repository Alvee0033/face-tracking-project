"use client"

import { useState, useEffect, useRef } from "react"
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from "agora-rtc-sdk-ng"
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { agoraAPI } from "@/lib/api"

interface AgoraVideoCallProps {
  channel: string
  onCallEnd?: () => void
  userName?: string
}

export function AgoraVideoCall({ channel, onCallEnd, userName }: AgoraVideoCallProps) {
  const [isJoined, setIsJoined] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([])

  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize Agora client
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
    clientRef.current = client

    // Event handlers
    client.on("user-published", async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType)

        if (mediaType === "video") {
          setRemoteUsers(prev => {
            const exists = prev.find(u => u.uid === user.uid)
            if (exists) return prev
            return [...prev, user]
          })
        }

        if (mediaType === "audio") {
          user.audioTrack?.play()
        }
      } catch (error) {
        console.error("Error subscribing to user:", error)
      }
    })

    client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "video") {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
      }
    })

    client.on("user-left", (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
    })

    return () => {
      // Cleanup function - only run when component unmounts
      const cleanup = async () => {
        try {
          const client = clientRef.current

          // Stop and close local tracks
          if (localVideoTrackRef.current) {
            localVideoTrackRef.current.stop()
            localVideoTrackRef.current.close()
          }

          if (localAudioTrackRef.current) {
            localAudioTrackRef.current.stop()
            localAudioTrackRef.current.close()
          }

          // Leave channel if connected
          if (client && isJoined) {
            await client.leave()
          }
        } catch (error) {
          console.error("Cleanup error:", error)
        }
      }

      cleanup()
    }
  }, [])

  const joinCall = async () => {
    try {
      setIsJoining(true)
      const client = clientRef.current
      if (!client) {
        alert("Video client not initialized. Please refresh the page.")
        setIsJoining(false)
        return
      }

      // Get token from backend
      console.log('[Agora] Requesting token for channel:', channel)
      const response = await agoraAPI.generateToken({ channelName: channel, role: 'publisher' })
      console.log('[Agora] Token response:', response.data)

      if (!response.data || !response.data.success) {
        console.error('[Agora] Invalid response structure:', response.data)
        alert("Failed to get video call credentials. Please try again.")
        setIsJoining(false)
        return
      }

      const { token, appId, uid } = response.data.data

      if (!appId) {
        console.error('[Agora] Missing App ID in response')
        alert("Agora App ID not configured. Please contact support.")
        setIsJoining(false)
        return
      }

      console.log('[Agora] Joining with App ID:', appId, 'Token:', token ? 'present' : 'null', 'UID:', uid)

      // Join channel with token (token can be null for testing mode)
      await client.join(appId, channel, token, uid)

      // Request microphone and camera permissions explicitly
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true }, // Audio settings
        { encoderConfig: "720p_2" } // Video settings
      )

      localAudioTrackRef.current = audioTrack
      localVideoTrackRef.current = videoTrack

      // Play local video
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current)
      }

      // Publish tracks
      await client.publish([audioTrack, videoTrack])

      setIsJoined(true)
      setIsJoining(false)
      console.log('[Agora] Successfully joined call')
    } catch (error: any) {
      console.error("Failed to join call:", error)
      setIsJoining(false)

      // More specific error messages
      if (error.message?.includes('Permission denied') || error.code === 'PERMISSION_DENIED') {
        alert("Camera/Microphone permission denied. Please allow access in your browser settings and try again.")
      } else if (error.message?.includes('NotFoundError') || error.code === 'DEVICE_NOT_FOUND') {
        alert("No camera or microphone found. Please check your devices and try again.")
      } else if (error.code === 'INVALID_PARAMS') {
        alert("Invalid Agora configuration. Please check your Agora App ID.")
      } else if (error.response) {
        // API error
        alert(`Failed to generate video call token: ${error.response.data?.message || error.message}`)
      } else {
        alert(`Failed to join call: ${error.message || 'Unknown error'}. Please try again.`)
      }
    }
  }

  const leaveCall = async () => {
    try {
      const client = clientRef.current

      // Only leave if we're actually joined
      if (!client || !isJoined) {
        return
      }

      // Stop and close local tracks
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop()
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }

      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop()
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }

      // Leave channel
      await client.leave()

      setIsJoined(false)
      setRemoteUsers([])

      onCallEnd?.()
    } catch (error) {
      console.error("Failed to leave call:", error)
      // Still reset state even if leave fails
      setIsJoined(false)
      setRemoteUsers([])
    }
  }

  const toggleVideo = async () => {
    const videoTrack = localVideoTrackRef.current
    if (!videoTrack) return

    if (isVideoEnabled) {
      await videoTrack.setEnabled(false)
      setIsVideoEnabled(false)
    } else {
      await videoTrack.setEnabled(true)
      setIsVideoEnabled(true)
    }
  }

  const toggleAudio = async () => {
    const audioTrack = localAudioTrackRef.current
    if (!audioTrack) return

    if (isAudioEnabled) {
      await audioTrack.setEnabled(false)
      setIsAudioEnabled(false)
    } else {
      await audioTrack.setEnabled(true)
      setIsAudioEnabled(true)
    }
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {!isJoined ? (
        /* Join Call Screen */
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 bg-gray-800 rounded-lg max-w-md">
            <Video className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Join?</h2>
            <p className="text-gray-300 mb-6">
              Click the button below to join the video call. Your browser will ask for camera and microphone permissions.
            </p>
            <Button
              onClick={joinCall}
              disabled={isJoining}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg rounded-full"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3 inline-block"></div>
                  Joining...
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-3 inline" />
                  Join Call
                </>
              )}
            </Button>
            <p className="text-gray-500 text-sm mt-4">
              💡 Make sure your camera and microphone are connected
            </p>
          </div>
        </div>
      ) : (
        /* Video Call Screen */
        <>
          {/* Video Grid */}
          <div className="relative w-full h-[calc(100%-80px)]">
            {/* Remote Videos */}
            <div className={`grid ${remoteUsers.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 w-full h-full p-4`}>
              {remoteUsers.map((user) => (
                <RemoteVideo key={user.uid} user={user} />
              ))}

              {remoteUsers.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Waiting for others to join...</p>
                    <p className="text-gray-500 text-sm mt-2">Share the channel name to invite participants</p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <Card className="absolute bottom-4 right-4 w-48 h-36 overflow-hidden border-2 border-white shadow-lg">
              <div ref={localVideoRef} className="w-full h-full bg-gray-800">
                {!isVideoEnabled && (
                  <div className="flex items-center justify-center h-full bg-gray-800">
                    <VideoOff className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                {userName || 'You'}
              </div>
            </Card>
          </div>

          {/* Controls */}
          <div className="h-20 bg-gray-800 flex items-center justify-center space-x-4 px-4">
            <Button
              onClick={toggleAudio}
              variant={isAudioEnabled ? "outline" : "destructive"}
              className="rounded-full h-14 w-14 p-0"
            >
              {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>

            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "outline" : "destructive"}
              className="rounded-full h-14 w-14 p-0"
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>

            <Button
              onClick={leaveCall}
              variant="destructive"
              className="rounded-full h-14 w-14 p-0 bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>

          {/* Call Status */}
          {isJoined && (
            <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
              <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
              <span>Connected</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Remote Video Component
function RemoteVideo({ user }: { user: IAgoraRTCRemoteUser }) {
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (videoRef.current && user.videoTrack) {
      user.videoTrack.play(videoRef.current)
    }

    return () => {
      user.videoTrack?.stop()
    }
  }, [user])

  return (
    <Card className="relative w-full h-full overflow-hidden bg-gray-800">
      <div ref={videoRef} className="w-full h-full" />

      {!user.hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="h-24 w-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-gray-400">
                {user.uid.toString().charAt(0)}
              </span>
            </div>
            <p className="text-gray-400">Camera off</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-sm text-white">
        User {user.uid}
      </div>

      {user.hasAudio && (
        <div className="absolute top-4 right-4 bg-green-600 p-2 rounded-full">
          <Mic className="h-4 w-4 text-white" />
        </div>
      )}
    </Card>
  )
}
