"use client"

import { useEffect, useRef } from 'react'

interface JitsiVideoCallProps {
  roomName: string
  displayName?: string
  onCallEnd?: () => void
  domain?: string
  isModerator?: boolean
  jwt?: string // JWT token for authentication
}

const DEFAULT_DOMAIN = 'meet.jit.si'

export function JitsiVideoCall({ 
  roomName, 
  displayName = 'User',
  onCallEnd,
  domain = DEFAULT_DOMAIN,
  isModerator = false,
  jwt
}: JitsiVideoCallProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)

  useEffect(() => {
    // Dynamically load Jitsi Meet API script
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if ((window as any).JitsiMeetExternalAPI) {
          resolve((window as any).JitsiMeetExternalAPI)
          return
        }

        const script = document.createElement('script')
        script.src = `https://${domain}/external_api.js`
        script.async = true
        script.onload = () => resolve((window as any).JitsiMeetExternalAPI)
        script.onerror = reject
        document.body.appendChild(script)
      })
    }

    const initializeJitsi = async () => {
      try {
        const JitsiMeetExternalAPI = await loadJitsiScript()
        
        if (!jitsiContainerRef.current || apiRef.current) return

        // Create Jitsi Meet instance with minimal config (no authentication)
        const api = new (JitsiMeetExternalAPI as any)(domain, {
          roomName: roomName,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            requireDisplayName: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'chat', 'settings',
              'videoquality', 'filmstrip', 'tileview'
            ],
            MOBILE_APP_PROMO: false,
          },
          userInfo: {
            displayName: displayName
          }
        })

        // Event listeners
        api.addEventListener('readyToClose', () => {
          if (onCallEnd) onCallEnd()
        })

        api.addEventListener('videoConferenceLeft', () => {
          if (onCallEnd) onCallEnd()
        })

        apiRef.current = api
      } catch (error) {
        console.error('Error loading Jitsi Meet:', error)
      }
    }

    initializeJitsi()

    // Cleanup
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [roomName, displayName, domain, onCallEnd])

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <div ref={jitsiContainerRef} className="w-full h-full" />
    </div>
  )
}
