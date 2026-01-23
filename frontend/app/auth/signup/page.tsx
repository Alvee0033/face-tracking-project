"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Users, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { authAPI } from "@/lib/api"

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const roleParam = searchParams.get("role")
    if (roleParam === "recruiter") setRole("recruiter")
    if (roleParam === "candidate") setRole("candidate")
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === "signup") {
        // Sign up
        if (!fullName || !email || !password) {
          setError("Please fill in all fields")
          setLoading(false)
          return
        }

        const response = await authAPI.signup({
          email,
          password,
          fullName,
          role
        })

        // Store token and user data
        if (response.data.session?.access_token) {
          localStorage.setItem('access_token', response.data.session.access_token)
          localStorage.setItem('user', JSON.stringify(response.data.user))
          router.push(`/${role}/dashboard`)
        } else {
          setError("Signup successful! Please check your email to verify your account.")
          setLoading(false)
        }
      } else {
        // Sign in
        if (!email || !password) {
          setError("Please fill in all fields")
          setLoading(false)
          return
        }

        const response = await authAPI.login({
          email,
          password
        })

        // Store token and user data
        if (response.data.session?.access_token) {
          localStorage.setItem('access_token', response.data.session.access_token)
          localStorage.setItem('user', JSON.stringify(response.data.user))
          router.push(`/${response.data.user.role}/dashboard`)
        } else {
          setError("Login failed. Please try again.")
          setLoading(false)
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.response?.data?.message || "Authentication failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-gray-50 to-teal-50 text-gray-900 font-sans flex items-center justify-center relative overflow-hidden">

      {/* Subtle Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-teal-200/20 rounded-full blur-[150px]" />
      </div>

      {/* Back Button */}
      <Link href="/" className="fixed top-8 left-8 z-50 group flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium text-xs tracking-widest uppercase">Home</span>
      </Link>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[420px] px-4"
      >
        {/* The Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-2xl">

          {/* Header / Toggle */}
          <div className="mb-8">
            <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 mb-6">
              <button
                onClick={() => setMode("signin")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300",
                  mode === "signin" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300",
                  mode === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Sign Up
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold font-orbitron bg-gradient-to-r from-gray-900 to-teal-600 bg-clip-text text-transparent">
                  {mode === "signin" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {mode === "signin" ? "Log in to your dashboard" : "Join Vantage to get started"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <AnimatePresence mode="popLayout" initial={false}>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Role Selection */}
                  <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-200 relative">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider absolute -top-5 left-1">I am a...</label>
                    <div className="flex relative items-center">
                      <motion.div
                        animate={{
                          x: role === "candidate" ? "0%" : "100%",
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute left-0 top-0 bottom-0 w-1/2 bg-white rounded-lg border border-gray-200 shadow-sm"
                      />

                      <button
                        type="button"
                        onClick={() => setRole("candidate")}
                        className={cn(
                          "flex-1 relative z-10 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors duration-200",
                          role === "candidate" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        <Users className={cn("w-3.5 h-3.5", role === "candidate" ? "text-teal-600" : "text-gray-400")} />
                        Candidate
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("recruiter")}
                        className={cn(
                          "flex-1 relative z-10 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors duration-200",
                          role === "recruiter" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        <Briefcase className={cn("w-3.5 h-3.5", role === "recruiter" ? "text-teal-600" : "text-gray-400")} />
                        Recruiter
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider ml-1">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Password</label>
                {mode === "signin" && <Link href="#" className="text-[10px] text-teal-600 hover:text-teal-700 transition-colors font-medium">Forgot Password?</Link>}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-rose-700 text-xs bg-rose-50 p-3 rounded-lg border border-rose-200">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-700 hover:to-teal-600 transition-all duration-300 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        </div>
      </motion.div>
    </div>
  )
}
