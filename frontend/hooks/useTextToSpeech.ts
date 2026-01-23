import { useEffect, useRef, useCallback, useState } from 'react'

export function useTextToSpeech() {
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices()
                setVoices(availableVoices)
            }

            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    const speak = useCallback((text: string, options?: {
        rate?: number
        pitch?: number
        volume?: number
        voice?: SpeechSynthesisVoice
        onEnd?: () => void
    }) => {
        if (!synthRef.current) {
            console.warn('Speech synthesis not supported')
            return
        }

        // Cancel any ongoing speech
        synthRef.current.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = options?.rate || 1.0
        utterance.pitch = options?.pitch || 1.0
        utterance.volume = options?.volume || 1.0

        if (options?.voice) {
            utterance.voice = options.voice
        }

        if (options?.onEnd) {
            utterance.onend = options.onEnd
        }

        utteranceRef.current = utterance
        synthRef.current.speak(utterance)
    }, [])

    const stop = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel()
        }
    }, [])

    return {
        speak,
        stop,
        voices
    }
}
