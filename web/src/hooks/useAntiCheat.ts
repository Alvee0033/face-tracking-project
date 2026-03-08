import { useState, useEffect, useCallback, useRef } from 'react'

export interface AntiCheatState {
    tabSwitches: number
    fullscreenExits: number
    isFullscreen: boolean
    violations: string[]
}

export interface AntiCheatOptions {
    enforceFullscreen?: boolean
    onViolation?: (type: 'tab_switch' | 'fullscreen_exit') => void
    maxViolations?: number
    onMaxViolationsReached?: () => void
}

export function useAntiCheat(options: AntiCheatOptions = {}) {
    const {
        enforceFullscreen = true,
        onViolation,
        maxViolations = 10,
        onMaxViolationsReached
    } = options

    const [state, setState] = useState<AntiCheatState>({
        tabSwitches: 0,
        fullscreenExits: 0,
        isFullscreen: false,
        violations: []
    })

    const isActiveRef = useRef(true)

    const enterFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen()
        } catch (error) {
            console.warn('Fullscreen request failed:', error)
        }
    }, [])

    const handleVisibilityChange = useCallback(() => {
        if (document.hidden && isActiveRef.current) {
            setState(prev => {
                const newTabSwitches = prev.tabSwitches + 1
                const newViolations = [...prev.violations, `Tab switch at ${new Date().toLocaleTimeString()}`]

                onViolation?.('tab_switch')

                if (newTabSwitches + prev.fullscreenExits >= maxViolations) {
                    onMaxViolationsReached?.()
                }

                return {
                    ...prev,
                    tabSwitches: newTabSwitches,
                    violations: newViolations
                }
            })
        }
    }, [onViolation, maxViolations, onMaxViolationsReached])

    const handleFullscreenChange = useCallback(() => {
        const isNowFullscreen = !!document.fullscreenElement

        setState(prev => {
            if (!isNowFullscreen && prev.isFullscreen && isActiveRef.current) {
                const newFullscreenExits = prev.fullscreenExits + 1
                const newViolations = [...prev.violations, `Fullscreen exit at ${new Date().toLocaleTimeString()}`]

                onViolation?.('fullscreen_exit')

                if (prev.tabSwitches + newFullscreenExits >= maxViolations) {
                    onMaxViolationsReached?.()
                }

                // Re-enter fullscreen if enforced
                if (enforceFullscreen) {
                    setTimeout(() => enterFullscreen(), 500)
                }

                return {
                    ...prev,
                    fullscreenExits: newFullscreenExits,
                    isFullscreen: isNowFullscreen,
                    violations: newViolations
                }
            }

            return { ...prev, isFullscreen: isNowFullscreen }
        })
    }, [enforceFullscreen, enterFullscreen, onViolation, maxViolations, onMaxViolationsReached])

    useEffect(() => {
        // Enter fullscreen on mount
        if (enforceFullscreen) {
            enterFullscreen()
        }

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('fullscreenchange', handleFullscreenChange)

        return () => {
            isActiveRef.current = false
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)

            // Exit fullscreen on unmount
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { })
            }
        }
    }, [enforceFullscreen, enterFullscreen, handleVisibilityChange, handleFullscreenChange])

    const reset = useCallback(() => {
        setState({
            tabSwitches: 0,
            fullscreenExits: 0,
            isFullscreen: !!document.fullscreenElement,
            violations: []
        })
    }, [])

    return {
        ...state,
        enterFullscreen,
        reset
    }
}
