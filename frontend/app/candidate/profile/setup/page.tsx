"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CommonNavbar } from "@/components/common-navbar"

export default function CandidateProfileSetupPage() {
  const router = useRouter()
  const [skills] = useState([])

  const handleManualEntry = () => {
    router.push("/candidate/profile/edit")
  }

  const handleViewJobs = () => {
    router.push("/candidate/jobs")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-white border border-gray-200">
            <div className="space-y-6">
              {/* Profile Icon */}
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#633ff3]/10">
                  <FileText className="h-10 w-10 text-[#633ff3]" strokeWidth={1.5} />
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Let's Build Your Profile</h1>
                <p className="text-gray-600">
                  Upload your CV for a quick start, or enter your details manually.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button className="w-full h-12 bg-[#633ff3] hover:bg-[#5330d4] text-white gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CV & Auto-fill
                </Button>

                <Button
                  className="w-full h-12 border-[#633ff3] text-[#633ff3] hover:bg-[#633ff3] hover:text-white gap-2"
                  variant="outline"
                  onClick={handleManualEntry}
                >
                  <FileText className="h-4 w-4" />
                  Enter Details Manually
                </Button>
              </div>

              {/* Skills Preview */}
              {skills.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Your Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <Button
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700"
                onClick={handleViewJobs}
              >
                View Recommended Jobs
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

