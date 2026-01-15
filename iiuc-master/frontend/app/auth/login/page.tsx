"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { authAPI } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState<"candidate" | "recruiter">("candidate")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
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
        const userRole = response.data.user.role;

        // Validate if the logged in user matches the selected role
        if (userRole && userRole !== userType) {
          setError(`This account is registered as a ${userRole}, but you are trying to login as a ${userType}. Please switch tabs.`)
          setLoading(false)
          // Optional: Clear token if we want to enforce strict login
          // localStorage.removeItem('access_token') 
          return
        }

        localStorage.setItem('access_token', response.data.session.access_token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        router.push(`/${response.data.user.role}/dashboard`)
      } else {
        setError("Login failed. Please try again.")
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || "Invalid credentials. Please try again.")
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

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 md:p-10 shadow-2xl">

          {/* Header */}
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-gray-900 to-teal-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm">Log in to your dashboard</p>
          </div>

          {/* Role Toggle */}
          <div className="flex p-1 bg-gray-100/80 rounded-xl mb-8 relative">
            <div
              className={cn(
                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-spring",
                userType === "recruiter" ? "left-[calc(50%+2px)]" : "left-1"
              )}
            />
            <button
              type="button"
              onClick={() => setUserType("candidate")}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors duration-300",
                userType === "candidate" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setUserType("recruiter")}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors duration-300",
                userType === "recruiter" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Recruiter
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Password</label>
                  <Link href="#" className="text-[10px] text-teal-600 hover:text-teal-700 transition-colors font-medium">Forgot?</Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-rose-700 text-xs bg-rose-50 p-3 rounded-lg border border-rose-200"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-700 hover:to-teal-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-teal-600 font-bold hover:text-teal-700 transition-colors">
                Create Account
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
