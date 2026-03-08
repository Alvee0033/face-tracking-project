"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { RecruiterNavbar } from "@/components/recruiter-navbar"
import { Button } from "@/components/ui/button"
import { AgoraVideoCall } from "@/components/agora-video-call"
import { ArrowLeft } from "lucide-react"

export default function RecruiterVideoCallPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const channel = searchParams.get('channel')
  const candidateName = searchParams.get('candidateName') || 'Candidate'

  if (!channel) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden font-inter">
        {/* Ambient Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-teal-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px]" />
        </div>
        <RecruiterNavbar />
        <main className="container mx-auto px-6 py-8 relative z-10">
          <div className="max-w-md mx-auto p-8 bg-white/80 backdrop-blur-xl border border-red-200 rounded-3xl shadow-lg shadow-teal-900/5 text-center">
            <h1 className="text-xl font-bold text-slate-900 mb-4">Invalid Call</h1>
            <p className="text-slate-500 mb-6 font-medium">No channel information provided</p>
            <Button
              onClick={() => router.back()}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
            >
              Go Back
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interview
          </Button>
          <div className="border-l border-gray-600 h-6" />
          <div>
            <h1 className="text-lg font-bold text-white">Video Interview</h1>
            <p className="text-sm text-gray-400">with {candidateName}</p>
          </div>
        </div>
      </div>

      {/* Agora Video Call Component */}
      <div className="flex-1">
        <AgoraVideoCall
          channel={channel}
          userName="Recruiter"
          onCallEnd={() => router.back()}
        />
      </div>
    </div>
  )
}
