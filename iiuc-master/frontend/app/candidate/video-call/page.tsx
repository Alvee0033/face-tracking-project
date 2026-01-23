"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CommonNavbar } from "@/components/common-navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CandidateVideoCallPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const channel = searchParams.get('channel')
  const recruiterName = searchParams.get('recruiterName')

  useEffect(() => {
    if (channel) {
      // Open Jitsi in a new tab
      const jitsiUrl = `https://meet.jit.si/${channel}#config.prejoinPageEnabled=false&userInfo.displayName="Candidate"`
      window.open(jitsiUrl, '_blank')
      
      // Redirect back after opening
      setTimeout(() => {
        router.back()
      }, 1000)
    }
  }, [channel, router])

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CommonNavbar />
        <main className="container mx-auto px-6 py-8">
          <Card className="max-w-md mx-auto p-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Invalid Call</h1>
            <p className="text-gray-600 mb-6">No channel information provided</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CommonNavbar />
      <main className="container mx-auto px-6 py-8">
        <Card className="max-w-md mx-auto p-6 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#633ff3] border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Opening Jitsi Meeting...</h1>
          <p className="text-gray-600 mb-6">
            The video call is opening in a new tab. You can login to Jitsi if needed.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </main>
    </div>
  )
}
