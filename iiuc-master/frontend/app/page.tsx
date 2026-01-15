"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Users, Briefcase, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter">("candidate")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const handleContinue = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    router.push(`/auth/signup?role=${selectedRole}`)
  }

  const subtitles = {
    candidate: "Unlock your true potential with AI-powered career guidance",
    recruiter: "The intelligent infrastructure for modern talent acquisition"
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-gray-50 to-teal-50 text-gray-900 font-sans flex items-center justify-center relative overflow-hidden">

      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-teal-200/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-200/20 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl px-6 text-center"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-6xl sm:text-7xl font-bold font-orbitron tracking-tight mb-4 bg-gradient-to-r from-gray-900 via-teal-700 to-teal-600 bg-clip-text text-transparent">
            Welcome to Vantage
          </h1>

          <AnimatePresence mode="wait">
            <motion.p
              key={selectedRole}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-lg text-gray-600 font-medium"
            >
              {subtitles[selectedRole]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Role Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-gray-200 shadow-lg inline-flex relative">
            <motion.div
              animate={{
                x: selectedRole === "candidate" ? "0%" : "100%",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-2 top-2 bottom-2 w-[calc(50%-8px)] bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-md"
            />

            <button
              onClick={() => setSelectedRole("candidate")}
              className={cn(
                "relative z-10 flex items-center gap-2 px-8 py-4 rounded-xl transition-colors duration-200 font-bold",
                selectedRole === "candidate" ? "text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Users className="w-5 h-5" />
              Candidate
            </button>

            <button
              onClick={() => setSelectedRole("recruiter")}
              className={cn(
                "relative z-10 flex items-center gap-2 px-8 py-4 rounded-xl transition-colors duration-200 font-bold",
                selectedRole === "recruiter" ? "text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Briefcase className="w-5 h-5" />
              Recruiter
            </button>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <button
            onClick={handleContinue}
            disabled={loading}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-12 py-5 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <span className="relative flex items-center gap-2">
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
          </button>
        </motion.div>

        {/* Decorative Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12 flex items-center justify-center gap-2 text-sm text-gray-500"
        >
          <Sparkles className="w-4 h-4 text-teal-500" />
          <span>Powered by AI</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
