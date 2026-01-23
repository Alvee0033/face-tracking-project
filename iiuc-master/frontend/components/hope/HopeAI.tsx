"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { Status, TranscriptEntry } from '@/lib/hope/types';
import { decode, decodeAudioData, createPcmBlob, blobToBase64 } from '@/lib/hope/audioUtils';
import { fetchUserContext, formatUserContextForPrompt } from '@/lib/hope/userContext';
import { ConversationControls } from './ConversationControls';
import { TranscriptDisplay } from './TranscriptDisplay';

// Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;
const FRAME_RATE = 2;
const JPEG_QUALITY = 0.7;
const API_KEY = 'AIzaSyCGYNwiZz-LZSURDdQZhmLVFTRI6cjtqm8';

// Gemini Function Declaration for emotion analysis
const reportEmotionFunctionDeclaration: FunctionDeclaration = {
  name: 'reportEmotion',
  parameters: {
    type: Type.OBJECT,
    description: 'Reports the primary emotion detected from the user\'s facial expression.',
    properties: {
      emotion: {
        type: Type.STRING,
        description: 'The detected emotion. One of: happy, sad, angry, surprised, neutral.',
      },
    },
    required: ['emotion'],
  },
};

export const HopeAI: React.FC = () => {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
  const [liveTranscript, setLiveTranscript] = useState({ user: '', hope: '' });
  const currentUserTurnRef = useRef('');
  const currentHopeTurnRef = useRef('');

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextsRef = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
    source: MediaStreamAudioSourceNode | null;
    processor: ScriptProcessorNode | null;
    outputSources: Set<AudioBufferSourceNode>;
    nextStartTime: number;
    isAISpeaking: boolean;
  }>({
    input: null,
    output: null,
    source: null,
    processor: null,
    outputSources: new Set(),
    nextStartTime: 0,
    isAISpeaking: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(e => console.error("Video play failed:", e));
    }
  }, [mediaStream]);

  const cleanupConversationResources = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session) => session.close());
      sessionPromiseRef.current = null;
    }

    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    const { input, output, source, processor, outputSources } = audioContextsRef.current;
    
    outputSources.forEach(s => s.stop());
    outputSources.clear();

    processor?.disconnect();
    source?.disconnect();
    
    mediaStream?.getTracks().forEach((track) => track.stop());
    setMediaStream(null);

    input?.close().catch(console.error);
    output?.close().catch(console.error);

    audioContextsRef.current = {
      input: null,
      output: null,
      source: null,
      processor: null,
      outputSources: new Set(),
      nextStartTime: 0,
      isAISpeaking: false,
    };
  }, [mediaStream]);

  const stopConversation = useCallback(() => {
    cleanupConversationResources();
    
    setTranscriptHistory([]);
    currentUserTurnRef.current = '';
    currentHopeTurnRef.current = '';
    setLiveTranscript({ user: '', hope: '' });
    setDetectedEmotion('');
    setErrorMessage(null);
    setStatus(Status.IDLE);
  }, [cleanupConversationResources]);

  const startConversation = useCallback(async () => {
    cleanupConversationResources();
    setStatus(Status.CONNECTING);
    setErrorMessage(null);
    
    setTranscriptHistory([]);
    currentUserTurnRef.current = '';
    currentHopeTurnRef.current = '';
    setLiveTranscript({ user: '', hope: '' });
    setDetectedEmotion('');

    if (!API_KEY) {
      const errorMsg = 'Gemini API key is not configured.';
      console.error(errorMsg);
      setErrorMessage(errorMsg);
      setStatus(Status.ERROR);
      return;
    }

    try {
      // Fetch user context for personalized AI
      console.log('Fetching user context...');
      const userContext = await fetchUserContext();
      console.log('User context loaded successfully:', {
        userName: userContext.user?.full_name,
        skillsCount: userContext.skills.length,
        experienceCount: userContext.experiences.length,
        educationCount: userContext.educations.length,
        savedJobsCount: userContext.savedJobs.length,
        interestedJobsCount: userContext.interestedJobs.length,
        availableJobsCount: userContext.availableJobs.length,
        roadmapSkillsCount: userContext.roadmap?.skills_to_learn?.length || 0,
        roadmapTargetJobsCount: userContext.roadmap?.target_jobs?.length || 0,
      });
      
      const contextualSystemInstruction = formatUserContextForPrompt(userContext);
      console.log('System instruction created (length):', contextualSystemInstruction.length, 'characters');
      console.log('Hope AI is now fully aware of user profile, skills, jobs, and roadmap! 🚀');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioContextsRef.current.input = inputAudioContext;
      audioContextsRef.current.output = outputAudioContext;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [reportEmotionFunctionDeclaration] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: contextualSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const processor = inputAudioContext.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);

            processor.onaudioprocess = (audioProcessingEvent) => {
              // Only send audio input when AI is not speaking
              if (!audioContextsRef.current.isAISpeaking) {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };

            source.connect(processor);
            processor.connect(inputAudioContext.destination);

            audioContextsRef.current.source = source;
            audioContextsRef.current.processor = processor;

            const videoEl = videoRef.current;
            const canvasEl = canvasRef.current;
            if (videoEl && canvasEl) {
              const ctx = canvasEl.getContext('2d');
              frameIntervalRef.current = window.setInterval(() => {
                if (!ctx || videoEl.paused || videoEl.ended) return;

                canvasEl.width = videoEl.videoWidth;
                canvasEl.height = videoEl.videoHeight;
                ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                
                canvasEl.toBlob(
                  async (blob) => {
                    if (blob) {
                      const base64Data = await blobToBase64(blob);
                      sessionPromiseRef.current?.then((session) => {
                        session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' },
                        });
                      });
                    }
                  },
                  'image/jpeg',
                  JPEG_QUALITY,
                );
              }, 1000 / FRAME_RATE);
            }
            
            setStatus(Status.LISTENING);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              const { outputSources } = audioContextsRef.current;
              outputSources.forEach((s) => s.stop());
              outputSources.clear();
              audioContextsRef.current.nextStartTime = 0;
              audioContextsRef.current.isAISpeaking = false;
              
              currentHopeTurnRef.current = '';
              setLiveTranscript(prev => ({ ...prev, hope: '' }));
              setStatus(Status.LISTENING);
              console.log('⚠️ Hope was interrupted - now listening');
            }

            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'reportEmotion' && fc.args && fc.args.emotion) {
                  setDetectedEmotion(fc.args.emotion as string);
                  sessionPromiseRef.current?.then((session) => {
                     session.sendToolResponse({
                       functionResponses: {
                         id : fc.id,
                         name: fc.name,
                         response: { result: "OK" },
                       }
                     })
                   });
                }
              }
            }

            let userTurn = currentUserTurnRef.current;
            let hopeTurn = currentHopeTurnRef.current;
            let shouldUpdateLive = false;

            if (message.serverContent?.inputTranscription) {
              userTurn += message.serverContent.inputTranscription.text;
              currentUserTurnRef.current = userTurn;
              shouldUpdateLive = true;
            }

            if (message.serverContent?.outputTranscription) {
              hopeTurn += message.serverContent.outputTranscription.text;
              currentHopeTurnRef.current = hopeTurn;
              shouldUpdateLive = true;
            }

            if (shouldUpdateLive) {
              setLiveTranscript({ user: userTurn, hope: hopeTurn });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext) {
              audioContextsRef.current.isAISpeaking = true;
              setStatus(Status.SPEAKING);
              const audioData = decode(base64Audio);
              const audioBuffer = await decodeAudioData(audioData, outputAudioContext, OUTPUT_SAMPLE_RATE, 1);
              
              const sourceNode = outputAudioContext.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outputAudioContext.destination);

              const { nextStartTime } = audioContextsRef.current;
              const currentTime = outputAudioContext.currentTime;
              const startTime = Math.max(nextStartTime, currentTime);
              
              sourceNode.start(startTime);
              audioContextsRef.current.nextStartTime = startTime + audioBuffer.duration;
              
              audioContextsRef.current.outputSources.add(sourceNode);
              sourceNode.onended = () => {
                audioContextsRef.current.outputSources.delete(sourceNode);
                
                // Check if all audio has finished playing
                if (audioContextsRef.current.outputSources.size === 0) {
                  audioContextsRef.current.isAISpeaking = false;
                  console.log('✅ Hope finished speaking - now listening for your input');
                }
              };
            }

            if (message.serverContent?.turnComplete) {
                // Only switch to listening if AI is not speaking
                setStatus((prevStatus) => {
                  if (prevStatus === Status.SPEAKING && !audioContextsRef.current.isAISpeaking) {
                    return Status.LISTENING;
                  }
                  return prevStatus;
                });
                
                const finalUserTurn = currentUserTurnRef.current;
                const finalHopeTurn = currentHopeTurnRef.current;

                setTranscriptHistory(prev => {
                  const newHistory = [...prev];
                  if (finalUserTurn.trim()) {
                    newHistory.push({ speaker: 'You', text: finalUserTurn.trim() });
                  }
                  if (finalHopeTurn.trim()) {
                    newHistory.push({ speaker: 'Hope', text: finalHopeTurn.trim() });
                  }
                  return newHistory;
                });
                
                currentUserTurnRef.current = '';
                currentHopeTurnRef.current = '';
                setLiveTranscript({ user: '', hope: '' });
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setErrorMessage('The connection was lost. Please try again.');
            setStatus(Status.ERROR);
            cleanupConversationResources();
          },
          onclose: () => {
            stopConversation();
          },
        },
      });

    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      let msg = 'I couldn\'t connect. Please check your network connection and browser permissions, then try again.';
      if (error.name === 'NotAllowedError') {
        msg = 'Camera and microphone access was denied. Please grant permissions in your browser settings and try again.';
      }
      setErrorMessage(msg);
      setStatus(Status.ERROR);
      cleanupConversationResources();
    }
  }, [cleanupConversationResources, stopConversation]);

  const handleToggleConversation = () => {
    if (status === Status.IDLE || status === Status.ERROR) {
      startConversation();
    } else {
      stopConversation();
    }
  };
  
  useEffect(() => {
    return () => {
      stopConversation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const videoBorderColor = status === Status.LISTENING ? 'border-blue-400' : status === Status.SPEAKING ? 'border-amber-400' : 'border-gray-300';
  const speakingAnimationClass = status === Status.SPEAKING ? 'animate-pulse' : '';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-73px)] bg-gray-200 p-4">
      <div className="relative flex flex-col h-[90vh] max-h-[700px] w-full max-w-[450px] bg-[#FEFDFB] text-[#1E1E1E] rounded-3xl shadow-2xl overflow-hidden">
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        <header className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-center">
            {(status !== Status.IDLE && status !== Status.ERROR) && (
              <div className="text-center">
                  <div className={`relative w-28 h-28 transition-all duration-500 ${speakingAnimationClass}`}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full rounded-xl object-cover bg-gray-200 border-4 ${videoBorderColor} transition-colors duration-500 shadow-lg`}
                    ></video>
                  </div>
                  {detectedEmotion && (
                      <p className="mt-3 text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full capitalize">
                          {detectedEmotion}
                      </p>
                  )}
              </div>
            )}
        </header>

        <main className="flex-grow flex flex-col text-center overflow-hidden pt-40">
          {status === Status.IDLE && (
            <div className="max-w-sm m-auto p-6 text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Hope</h1>
              <h2 className="text-xl font-medium text-gray-600 mb-4">Your Career Companion</h2>
              <p className="text-gray-500">
                A quiet space to talk through the challenges of the job search.
                When you're ready, I'm here to listen.
              </p>
            </div>
          )}
          {status === Status.ERROR && (
            <div className="p-8 max-w-sm m-auto bg-red-50 rounded-2xl border border-red-200">
              <h2 className="text-2xl font-bold text-red-800 mb-2">Connection Issue</h2>
              <p className="text-red-700">
                {errorMessage || "An unexpected error occurred. Please try again."}
              </p>
            </div>
          )}
          <TranscriptDisplay 
            history={transcriptHistory}
            currentUserTurn={liveTranscript.user}
            currentHopeTurn={liveTranscript.hope}
            status={status}
          />
        </main>
        <footer className="w-full p-6 z-10 bg-[#FEFDFB] border-t border-gray-100">
          <div className="max-w-md mx-auto">
            <ConversationControls status={status} onToggleConversation={handleToggleConversation} />
          </div>
        </footer>
      </div>
    </div>
  );
};
