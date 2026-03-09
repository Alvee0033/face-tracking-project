"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowRight, 
  Users, 
  Briefcase, 
  Sparkles, 
  Shield, 
  Cpu, 
  Zap, 
  ChevronRight, 
  CheckCircle2,
  Globe,
  Star,
  Layers,
  Search,
  LogIn
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter">("candidate")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleGetStarted = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    router.push(`/auth/signup?role=${selectedRole}`)
  }

  const handleLogin = () => {
    router.push("/auth/login")
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col items-center relative overflow-x-hidden selection:bg-teal-100 selection:text-teal-900">
      
      {/* --- ADVANCED AMBIENT BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Main Gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-teal-50/50 via-white to-blue-50/30" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-teal-200/20 rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-200/20 rounded-full blur-[140px]" 
        />
        
        {/* Subtle Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} 
        />
        
        {/* Floating Particles (using CSS only for simplicity) */}
        <div className="absolute inset-0 mask-image-linear-gradient-to-b">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 bg-teal-400/20 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${10 + Math.random() * 20}s infinite ease-in-out`
              }}
            />
          ))}
        </div>
      </div>

      {/* --- PREMIUM NAVIGATION --- */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "fixed top-0 left-0 w-full p-4 md:p-6 z-50 flex justify-center transition-all duration-300",
          scrolled ? "p-3 md:p-4" : ""
        )}
      >
        <div className={cn(
          "w-full max-w-7xl flex justify-between items-center px-6 py-3 rounded-2xl transition-all duration-500",
          scrolled 
            ? "bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/20 scale-[0.98]" 
            : "bg-white/40 backdrop-blur-md border border-white/40 shadow-sm"
        )}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/")}>
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-teal-500 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300 blur-[2px] opacity-20" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform active:scale-95">
                <Zap className="w-5 h-5 text-white fill-current animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black tracking-tighter text-slate-900 font-orbitron">
                VANTAGE
              </span>
              <span className="text-[10px] font-bold text-teal-600 tracking-[0.2em] uppercase">Enterprise</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-10 text-[13px] font-bold text-slate-500 uppercase tracking-wider">
            {["Technology", "Solutions", "Network", "Pricing"].map((link) => (
              <a 
                key={link} 
                href="#" 
                className="hover:text-teal-600 relative group transition-colors"
              >
                {link}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-500 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogin}
              className="hidden md:flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-100 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button className="relative overflow-hidden group bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-teal-600 transition-all duration-500 shadow-lg shadow-slate-900/10 active:scale-95">
              <span className="relative z-10 flex items-center gap-2">
                Join Network
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/0 via-teal-400/30 to-teal-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 w-full max-w-7xl px-6 pt-32 md:pt-48 pb-32 flex flex-col items-center">
        
        {/* --- HERO CONTENT --- */}
        <div className="text-center mb-24 space-y-8 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-teal-100 text-teal-700 text-[10px] font-black tracking-[0.2em] uppercase shadow-xl shadow-teal-500/5 mb-4"
          >
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
            Empowering the Global AI Talent Ecosystem
          </motion.div>

          <div className="relative">
            {/* Background blur for text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-teal-100/30 blur-[100px] pointer-events-none -z-10" />
            
            <h1 className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tight text-slate-900 leading-[0.9] md:leading-[1]">
              <motion.span 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="block mb-2"
              >
                The Neural Way
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="block bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent pb-4"
              >
                to Hire Anything.
              </motion.span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Vantage uses cutting-edge neural assessment engines to eliminate the noise in recruitment, matching elite talent with the world's most innovative teams.
          </motion.p>

          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="flex flex-wrap justify-center gap-6 pt-8"
          >
            {[
              { icon: Search, text: "Precision Search" },
              { icon: Shield, text: "Verified Credentials" },
              { icon: Layers, text: "Stack-First Matching" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm">
                <item.icon className="w-4 h-4 text-teal-500" />
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* --- INTERACTIVE ROLE SELECTOR --- */}
        <div className="w-full max-w-5xl mb-24 relative">
          {/* Glowing Aura behind cards */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-200/20 via-blue-200/20 to-purple-200/20 blur-[100px] opacity-50 -z-10" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Candidate Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              onClick={() => setSelectedRole("candidate")}
              className={cn(
                "group relative cursor-pointer p-1 rounded-[32px] transition-all duration-500 overflow-hidden",
                selectedRole === "candidate" 
                  ? "bg-gradient-to-br from-teal-500 to-teal-700 shadow-[0_20px_50px_rgba(20,184,166,0.3)] scale-[1.03]" 
                  : "bg-slate-200 shadow-xl shadow-slate-200/50 hover:bg-slate-300"
              )}
            >
              <div className="bg-white rounded-[28px] p-10 h-full flex flex-col gap-8 transition-colors duration-500">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                  selectedRole === "candidate" ? "bg-teal-600 text-white shadow-xl shadow-teal-600/30 rotate-3" : "bg-slate-50 text-slate-400 group-hover:scale-110"
                )}>
                  <Users className="w-8 h-8" />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-slate-900 font-orbitron tracking-tight">CANDIDATE</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Build a verified skill-graph, showcase your expertise to global recruiters, and secure your next growth leap.
                  </p>
                </div>

                <div className={cn(
                  "mt-auto flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all",
                  selectedRole === "candidate" ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500"
                )}>
                  Start Career Path <ChevronRight className="w-4 h-4 group-hover:translate-x-1" />
                </div>
              </div>
            </motion.div>

            {/* Recruiter Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              onClick={() => setSelectedRole("recruiter")}
              className={cn(
                "group relative cursor-pointer p-1 rounded-[32px] transition-all duration-500 overflow-hidden",
                selectedRole === "recruiter" 
                  ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_20px_50px_rgba(37,99,235,0.3)] scale-[1.03]" 
                  : "bg-slate-200 shadow-xl shadow-slate-200/50 hover:bg-slate-300"
              )}
            >
              <div className="bg-white rounded-[28px] p-10 h-full flex flex-col gap-8 transition-colors duration-500">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                  selectedRole === "recruiter" ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 -rotate-3" : "bg-slate-50 text-slate-400 group-hover:scale-110"
                )}>
                  <Briefcase className="w-8 h-8" />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-slate-900 font-orbitron tracking-tight">RECRUITER</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Deploy neural ranking to find the 1% of talent that fits your stack perfectly. Automated assessment, zero noise.
                  </p>
                </div>

                <div className={cn(
                  "mt-auto flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all",
                  selectedRole === "recruiter" ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500"
                )}>
                  Access Talent Suite <ChevronRight className="w-4 h-4 group-hover:translate-x-1" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* --- DYNAMIC CALL TO ACTION --- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full flex flex-col items-center gap-8"
        >
          <button
            onClick={handleGetStarted}
            disabled={loading}
            className="group relative w-full max-w-md h-18 rounded-[24px] bg-slate-900 text-white text-xl font-black uppercase tracking-widest shadow-2xl shadow-slate-900/30 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Enter the Future
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                </>
              )}
            </span>
          </button>
          
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            Already a member? <button onClick={handleLogin} className="text-teal-600 hover:underline">Sign in here</button>
          </p>
        </motion.div>

        {/* --- TRUSTED PARTNERS FOOTER --- */}
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           transition={{ delay: 0.4 }}
           className="mt-32 pt-16 border-t border-slate-200/80 w-full flex flex-col items-center gap-12"
        >
          <div className="flex flex-col items-center gap-1">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Engineered for Industry Leaders</span>
             <div className="w-12 h-0.5 bg-teal-500/30 rounded-full" />
          </div>
          <div className="flex flex-wrap justify-center gap-12 md:gap-20 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            {[
              { icon: Globe, name: "ORBITAL" },
              { icon: Cpu, name: "CORTEX" },
              { icon: Shield, name: "AEGIS" },
              { icon: Zap, name: "FLUX" },
              { icon: Star, name: "QUASAR" }
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-lg font-black text-slate-900 tracking-tighter">
                <p.icon className="w-6 h-6 text-teal-600" />
                {p.name}
              </div>
            ))}
          </div>
        </motion.div>
      </main>
      
      {/* Floating Action (Chat or Support) - Just visual decoration */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 rounded-2xl bg-white shadow-2xl shadow-teal-500/20 flex items-center justify-center text-teal-600 hover:scale-110 active:scale-95 transition-all border border-teal-50">
          <Sparkles className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
