"use client"

import { useState, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface VideoCallProps {
  appId: string;
  channelName: string;
  token: string;
  uid?: number;
  onCallEnd?: () => void;
}

export default function VideoCall({ appId, channelName, token, uid = 0, onCallEnd }: VideoCallProps) {
  const [client] = useState(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Set up event listeners
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers((prev) => {
              const existing = prev.find((u) => u.uid === user.uid);
              if (existing) {
                return prev.map((u) => (u.uid === user.uid ? user : u));
              }
              return [...prev, user];
            });
          }
          
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          }
        });

        client.on('user-left', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        // Join channel
        await client.join(appId, channelName, token, uid);
        
        // Create and publish local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        await client.publish([audioTrack, videoTrack]);
        setIsJoined(true);

        // Play local video
        videoTrack.play('local-player');
      } catch (err: any) {
        console.error('Error initializing video call:', err);
        setError(err.message || 'Failed to initialize video call');
      }
    };

    init();

    return () => {
      // Cleanup
      localAudioTrack?.close();
      localVideoTrack?.close();
      client.leave();
    };
  }, [appId, channelName, token, uid]);

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "auto");
        
        if (localVideoTrack) {
          await client.unpublish([localVideoTrack]);
          localVideoTrack.close();
        }
        
        // @ts-ignore - screenTrack can be array or single track
        const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
        await client.publish([track]);
        setLocalVideoTrack(track as ILocalVideoTrack);
        setIsScreenSharing(true);
        
        track.on('track-ended', async () => {
          await stopScreenShare();
        });
      } else {
        await stopScreenShare();
      }
    } catch (err: any) {
      console.error('Screen share error:', err);
      setError('Failed to share screen');
    }
  };

  const stopScreenShare = async () => {
    if (localVideoTrack && isScreenSharing) {
      await client.unpublish([localVideoTrack]);
      localVideoTrack.close();
      
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      await client.publish([videoTrack]);
      setLocalVideoTrack(videoTrack);
      setIsScreenSharing(false);
      videoTrack.play('local-player');
    }
  };

  const endCall = async () => {
    localAudioTrack?.close();
    localVideoTrack?.close();
    await client.leave();
    setIsJoined(false);
    onCallEnd?.();
  };

  useEffect(() => {
    // Play remote videos when users join
    remoteUsers.forEach((user) => {
      if (user.videoTrack) {
        user.videoTrack.play(`remote-player-${user.uid}`);
      }
    });
  }, [remoteUsers]);

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-600 font-medium">Error: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <div id="local-player" className="w-full h-full" />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-sm">
            You {isVideoEnabled ? '' : '(Video Off)'}
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <VideoOff className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {remoteUsers.length === 0 ? (
          <div className="flex items-center justify-center bg-gray-800 rounded-lg">
            <p className="text-gray-400">Waiting for other participant...</p>
          </div>
        ) : (
          remoteUsers.map((user) => (
            <div key={user.uid} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <div id={`remote-player-${user.uid}`} className="w-full h-full" />
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-sm">
                Participant {user.uid}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-6 flex items-center justify-center gap-4">
        <Button
          onClick={toggleVideo}
          className={`rounded-full w-14 h-14 ${
            isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
          title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
        >
          {isVideoEnabled ? (
            <Video className="h-6 w-6 text-white" />
          ) : (
            <VideoOff className="h-6 w-6 text-white" />
          )}
        </Button>

        <Button
          onClick={toggleAudio}
          className={`rounded-full w-14 h-14 ${
            isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? (
            <Mic className="h-6 w-6 text-white" />
          ) : (
            <MicOff className="h-6 w-6 text-white" />
          )}
        </Button>

        <Button
          onClick={toggleScreenShare}
          className={`rounded-full w-14 h-14 ${
            isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <MonitorOff className="h-6 w-6 text-white" />
          ) : (
            <Monitor className="h-6 w-6 text-white" />
          )}
        </Button>

        <Button
          onClick={endCall}
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          title="End call"
        >
          <PhoneOff className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Status Indicator */}
      {isJoined && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Connected
        </div>
      )}
    </div>
  );
}
