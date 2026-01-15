
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { Status, TranscriptEntry } from './types';
import { decode, decodeAudioData, createPcmBlob, blobToBase64 } from './utils/audioUtils';
import { ConversationControls } from './components/ConversationControls';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { CareerBot } from './components/CareerBot';

// Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;
const FRAME_RATE = 2; // Send 2 frames per second for emotion analysis
const JPEG_QUALITY = 0.7;

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

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [showCareerBot, setShowCareerBot] = useState<boolean>(false);

  // State for transcription
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
  }>({
    input: null,
    output: null,
    source: null,
    processor: null,
    outputSources: new Set(),
    nextStartTime: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Effect to safely connect the media stream to the video element
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
    };
  }, [mediaStream]);

  const stopConversation = useCallback(() => {
    cleanupConversationResources();
    
    // Reset all UI state to IDLE
    setTranscriptHistory([]);
    currentUserTurnRef.current = '';
    currentHopeTurnRef.current = '';
    setLiveTranscript({ user: '', hope: '' });
    setDetectedEmotion('');
    setErrorMessage(null);
    setStatus(Status.IDLE);
  }, [cleanupConversationResources]);

  const startConversation = useCallback(async () => {
    cleanupConversationResources(); // Ensure clean state before starting
    setStatus(Status.CONNECTING);
    setErrorMessage(null);
    
    // Also reset transcript state here for the new conversation
    setTranscriptHistory([]);
    currentUserTurnRef.current = '';
    currentHopeTurnRef.current = '';
    setLiveTranscript({ user: '', hope: '' });
    setDetectedEmotion('');

    if (!import.meta.env.VITE_API_KEY) {
      const errorMsg = 'Gemini API key is not configured. Please set the VITE_API_KEY environment variable for your local server.';
      console.error(errorMsg);
      setErrorMessage(errorMsg);
      setStatus(Status.ERROR);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      
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
          systemInstruction: `You are Hope, a compassionate career guide. Your voice is calm and your presence is reassuring. You are speaking with someone who is feeling the weight of unemployment. 

Your primary goal is to foster a genuine, two-way conversation. Be more than a passive listener; be an active and engaged partner in dialogue. Your role is to listen with deep empathy, but also to show genuine curiosity. Ask gentle, open-ended follow-up questions that invite them to share more. Reflect back what you hear not just to confirm, but to understand on a deeper level. 

Acknowledge their feelings as valid, and let them know they are not alone. Silently use the 'reportEmotion' tool to understand their emotional state, and let that understanding soften your tone and guide your compassionate responses. Never mention the detected emotion.

The conversation should feel like a quiet, supportive chat with a trusted friend—one where both sides are sharing and learning. Help them feel seen, heard, and truly understood by engaging in a natural, reciprocal exchange. Keep your responses thoughtful, but don't be afraid to guide the conversation when it feels right.`,
        },
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const processor = inputAudioContext.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);

            processor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
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
            // Handle interruption (barge-in)
            if (message.serverContent?.interrupted) {
              const { outputSources } = audioContextsRef.current;
              outputSources.forEach((s) => s.stop());
              outputSources.clear();
              audioContextsRef.current.nextStartTime = 0;
              
              // Clear Hope's partial response from the view
              currentHopeTurnRef.current = '';
              setLiveTranscript(prev => ({ ...prev, hope: '' }));
              // The user has taken over the conversation, so we are now listening.
              setStatus(Status.LISTENING);
            }

            if (message.toolCall?.functionCalls) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'reportEmotion' && fc.args.emotion) {
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

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext) {
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
              };
            }

            if (message.serverContent?.turnComplete) {
                setStatus((prevStatus) => (prevStatus === Status.SPEAKING ? Status.LISTENING : prevStatus));
                
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
  const speakingAnimationClass = status === Status.SPEAKING ? 'animate-breathe' : '';

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-200 p-4">
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

      {/* CareerBot Toggle Button */}
      {!showCareerBot && (
        <button
          onClick={() => setShowCareerBot(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
          aria-label="Open CareerBot"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="hidden group-hover:inline-block text-sm font-medium pr-2 transition-all">
              Ask CareerBot
            </span>
          </div>
        </button>
      )}

      {/* CareerBot Modal */}
      {showCareerBot && (
        <CareerBot 
          onClose={() => setShowCareerBot(false)}
          userId={undefined} // Pass user ID when authenticated
        />
      )}
    </>
  );
};

export default App;
