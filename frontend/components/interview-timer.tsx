"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface InterviewTimerProps {
    targetDate: string | Date
    className?: string
    compact?: boolean
}

export function InterviewTimer({ targetDate, className, compact = false }: InterviewTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{
        days: number
        hours: number
        minutes: number
        seconds: number
        isExpired: boolean
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false })

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime()

            if (difference <= 0) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
                isExpired: false
            }
        }

        // Initial calculation
        setTimeLeft(calculateTimeLeft())

        // Update every second
        const timer = setInterval(() => {
            const calculated = calculateTimeLeft()
            setTimeLeft(calculated)
            if (calculated.isExpired) {
                clearInterval(timer)
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [targetDate])

    if (timeLeft.isExpired) {
        return (
            <div className={cn("inline-flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100", className)}>
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Now / Started
            </div>
        )
    }

    if (compact) {
        return (
            <div className={cn("flex items-center gap-1.5 font-mono text-sm font-semibold text-blue-600", className)}>
                <Clock className="h-4 w-4" />
                <span>
                    {timeLeft.days > 0 && `${timeLeft.days}d `}
                    {timeLeft.hours.toString().padStart(2, '0')}h : {timeLeft.minutes.toString().padStart(2, '0')}m
                </span>
            </div>
        )
    }

    return (
        <div className={cn("flex items-center gap-3", className)}>
            <div className="flex flex-col items-center min-w-[3.5rem] bg-slate-900 rounded-lg p-2 text-white shadow-lg shadow-slate-900/10">
                <span className="text-xl font-bold font-mono">{timeLeft.days}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Days</span>
            </div>
            <span className="text-xl font-bold text-slate-300 pb-4">:</span>
            <div className="flex flex-col items-center min-w-[3.5rem] bg-slate-900 rounded-lg p-2 text-white shadow-lg shadow-slate-900/10">
                <span className="text-xl font-bold font-mono">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Hrs</span>
            </div>
            <span className="text-xl font-bold text-slate-300 pb-4">:</span>
            <div className="flex flex-col items-center min-w-[3.5rem] bg-slate-900 rounded-lg p-2 text-white shadow-lg shadow-slate-900/10">
                <span className="text-xl font-bold font-mono">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Mins</span>
            </div>
            <span className="text-xl font-bold text-slate-300 pb-4">:</span>
            <div className="flex flex-col items-center min-w-[3.5rem] bg-slate-900 rounded-lg p-2 text-white shadow-lg shadow-slate-900/10">
                <span className="text-xl font-bold font-mono">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Secs</span>
            </div>
        </div>
    )
}
