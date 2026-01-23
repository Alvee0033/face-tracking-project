"use client"

import { useState, useEffect, useRef } from "react"
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from "agora-rtc-sdk-ng"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, CheckCircle } from "lucide-react"
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
    <div className="absolute inset-0 w-full h-full bg-gray-950 overflow-hidden">
      {!isJoined ? (
        /* Join Call Screen */
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl max-w-md shadow-2xl">
            <div className="h-20 w-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="h-10 w-10 text-teal-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Join?</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Click the button below to join the video call. <br />
              <span className="text-sm text-gray-500">Your browser will ask for camera and microphone permissions.</span>
            </p>
            <Button
              onClick={joinCall}
              disabled={isJoining}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg rounded-xl font-medium shadow-lg shadow-teal-900/20 transition-all hover:scale-[1.02]"
            >
              {isJoining ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Connecting...
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-3" />
                  Join Interview Room
                </>
              )}
            </Button>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Camera</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Microphone</span>
            </div>
          </div>
        </div>
      ) : (
        /* Video Call Screen */
        <>
          {/* Main Video Area - Full Screen */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
            {remoteUsers.length === 0 ? (
              /* Empty State / Waiting */
              <div className="text-center p-10">
                <div className="relative mx-auto mb-6 w-24 h-24">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
                  <div className="relative bg-gray-900 rounded-full p-6 border border-gray-800">
                    <Video className="h-10 w-10 text-gray-500" />
                  </div>
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">Waiting for candidate...</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  The candidate hasn't joined yet. The video will appear here automatically when they connect.
                </p>
              </div>
            ) : (
              /* Remote Video Grid */
              <div className={`w-full h-full p-4 grid ${remoteUsers.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
                {remoteUsers.map((user) => (
                  <div key={user.uid} className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl">
                    <RemoteVideo user={user} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Video (PIP) - Draggable position could be nice, but fixed bottom-right is standard */}
          <Card className="absolute top-4 right-4 w-48 aspect-video overflow-hidden border border-gray-700/50 shadow-2xl bg-gray-900 rounded-xl z-20 hover:scale-105 transition-transform cursor-pointer group">
            <div ref={localVideoRef} className="w-full h-full bg-gray-800">
              {!isVideoEnabled && (
                <div className="flex items-center justify-center h-full bg-gray-900/90 backdrop-blur">
                  <VideoOff className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white font-medium flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isJoining ? 'bg-yellow-500' : 'bg-green-500'}`} />
              {userName || 'You'}
            </div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>

          {/* Controls Bar - Floating Bottom */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
            <div className="flex items-center gap-4 bg-gray-900/90 backdrop-blur-xl border border-gray-800/50 px-6 py-3 rounded-2xl shadow-2xl ring-1 ring-white/10">
              <Button
                onClick={toggleAudio}
                variant={isAudioEnabled ? "secondary" : "destructive"}
                className={`rounded-xl h-12 w-12 p-0 transition-all ${isAudioEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/90 hover:bg-red-600'}`}
                title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                onClick={toggleVideo}
                variant={isVideoEnabled ? "secondary" : "destructive"}
                className={`rounded-xl h-12 w-12 p-0 transition-all ${isVideoEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/90 hover:bg-red-600'}`}
                title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <div className="h-8 w-px bg-gray-700/50 mx-2" />

              <Button
                onClick={leaveCall}
                className="rounded-xl h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-900/20"
                title="Leave Call"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                End Call
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          {isJoined && (
            <div className="absolute top-4 left-4 z-20">
              <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-md border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Connection
              </div>
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
