import { useState, useRef, useCallback } from 'react'

export interface AudioRecorderState {
    isRecording: boolean
    audioBlob: Blob | null
    audioBase64: string | null
    duration: number
}

export function useAudioRecorder() {
    const [state, setState] = useState<AudioRecorderState>({
        isRecording: false,
        audioBlob: null,
        audioBase64: null,
        duration: 0
    })

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const startTimeRef = useRef<number>(0)

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            })

            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []
            startTimeRef.current = Date.now()

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000)

                // Convert to base64
                const reader = new FileReader()
                const audioBase64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1]
                        resolve(base64)
                    }
                    reader.readAsDataURL(audioBlob)
                })

                setState({
                    isRecording: false,
                    audioBlob,
                    audioBase64,
                    duration
                })

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setState(prev => ({ ...prev, isRecording: true }))

        } catch (error) {
            console.error('Failed to start recording:', error)
            throw error
        }
    }, [])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && state.isRecording) {
            mediaRecorderRef.current.stop()
        }
    }, [state.isRecording])

    const reset = useCallback(() => {
        setState({
            isRecording: false,
            audioBlob: null,
            audioBase64: null,
            duration: 0
        })
        audioChunksRef.current = []
    }, [])

    return {
        ...state,
        startRecording,
        stopRecording,
        reset
    }
}
