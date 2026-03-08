"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Users, Briefcase, Sparkles, Shield, Cpu, Zap, ChevronRight, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter">("candidate")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const handleContinue = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    router.push(`/auth/signup?role=${selectedRole}`)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 font-sans flex flex-col items-center relative overflow-hidden selection:bg-teal-100">
      
      {/* --- PROFESSIONAL LIGHT BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-50/40 via-white to-transparent" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[120px] opacity-60" />
        
        {/* Subtle Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]" 
          style={{ 
            backgroundImage: `linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} 
        />
      </div>

      {/* --- ENTERPRISE NAVIGATION --- */}
      <motion.nav 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 w-full p-6 z-50 flex justify-center"
      >
        <div className="w-full max-w-7xl flex justify-between items-center bg-white/70 backdrop-blur-md border border-slate-200/50 px-6 py-3 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-orbitron">
              VANTAGE
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#" className="hover:text-teal-600 transition-colors">Technology</a>
            <a href="#" className="hover:text-teal-600 transition-colors">Solutions</a>
            <a href="#" className="hover:text-teal-600 transition-colors">Enterprise</a>
            <button className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
              Schedule Demo
            </button>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 w-full max-w-6xl px-6 pt-32 pb-20 flex flex-col items-center">
        
        {/* --- HERO SECTION --- */}
        <div className="text-center mb-20 space-y-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[11px] font-bold tracking-wider uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Empowering the Global Talent Ecosystem
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="block"
            >
              The Future of AI-Driven
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="block bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent"
            >
              Talent Acquisition
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium"
          >
            Vantage leverages advanced neural matching technology to bridge the gap between world-class organizations and elite talent.
          </motion.p>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5 }}
             className="flex flex-wrap justify-center gap-4 pt-4 text-sm font-medium text-slate-400"
          >
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> Precision Matching</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> Neural Assessment</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> Verify-First Protocol</div>
          </motion.div>
        </div>

        {/* --- ROLE SELECTION CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
          {/* Candidate Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => setSelectedRole("candidate")}
            className={cn(
              "group relative cursor-pointer p-10 rounded-3xl transition-all duration-300",
              "border-2 bg-white",
              selectedRole === "candidate" 
                ? "border-teal-500 shadow-2xl shadow-teal-500/10 scale-[1.02]" 
                : "border-slate-100 shadow-xl shadow-slate-200/50 hover:border-teal-200 hover:shadow-2xl"
            )}
          >
            <div className="space-y-6">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                selectedRole === "candidate" ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30" : "bg-slate-50 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600"
              )}>
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3 font-orbitron tracking-tight">Candidate</h3>
                <p className="text-slate-500 leading-relaxed">
                  Navigate your career path with AI-driven insights, verified skills profiles, and exclusive opportunities.
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-2 text-sm font-bold transition-colors",
                selectedRole === "candidate" ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500"
              )}>
                Enter Candidate Portal <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Recruiter Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => setSelectedRole("recruiter")}
            className={cn(
              "group relative cursor-pointer p-10 rounded-3xl transition-all duration-300",
              "border-2 bg-white",
              selectedRole === "recruiter" 
                ? "border-blue-600 shadow-2xl shadow-blue-500/10 scale-[1.02]" 
                : "border-slate-100 shadow-xl shadow-slate-200/50 hover:border-blue-200 hover:shadow-2xl"
            )}
          >
            <div className="space-y-6">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                selectedRole === "recruiter" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
              )}>
                <Briefcase className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3 font-orbitron tracking-tight">Recruiter</h3>
                <p className="text-slate-500 leading-relaxed">
                  Identify top-tier talent instantly using neural ranking and automated verification protocols.
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-2 text-sm font-bold transition-colors",
                selectedRole === "recruiter" ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"
              )}>
                Enter Enterprise Suite <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- MAIN CALL TO ACTION --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full flex justify-center"
        >
          <button
            onClick={handleContinue}
            disabled={loading}
            className="group relative w-full max-w-md h-16 rounded-2xl bg-teal-600 text-white text-lg font-bold shadow-xl shadow-teal-600/20 hover:bg-teal-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Get Started for Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </span>
          </button>
        </motion.div>

        {/* --- INDUSTRY PARTNERS --- */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1 }}
           className="mt-24 pt-10 border-t border-slate-100 w-full flex flex-col items-center gap-10"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Trusted by Forward-Thinking Teams</span>
          <div className="flex flex-wrap justify-center gap-12 grayscale opacity-40">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border px-3 py-1 rounded-md border-slate-200">
               <Cpu className="w-4 h-4 text-teal-600" /> SYNRGI.AI
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border px-3 py-1 rounded-md border-slate-200">
               <Shield className="w-4 h-4 text-teal-600" /> FORTRESS
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border px-3 py-1 rounded-md border-slate-200">
               <Zap className="w-4 h-4 text-teal-600" /> VELOCITY
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border px-3 py-1 rounded-md border-slate-200">
               <Users className="w-4 h-4 text-teal-600" /> GLOBAL.NET
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
