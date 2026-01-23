"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Briefcase, User, LogOut, Menu, X, Bookmark, Heart, TrendingUp, Home, MessageCircle, BookOpen, Inbox, Sparkles, ChevronDown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/components/language-provider"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function CommonNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))

      // Prefetch Profile Data for instant load
      // We don't use the hook result, just trigger the fetch to populate cache
      import('@/lib/api').then(({ cvAPI }) => {
        cvAPI.getProfile().then(res => {
          if (res.data) {
            localStorage.setItem('candidate_profile_full', JSON.stringify({
              data: res.data,
              timestamp: Date.now()
            }))
          }
        }).catch(err => console.warn('Background prefetch failed', err))
      })
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!mounted) return
    const original = document.body.style.overflow
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = original
    return () => { document.body.style.overflow = original }
  }, [mobileMenuOpen, mounted])

  const isActive = (path: string) => {
    return pathname === path
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    localStorage.removeItem("profile_last_fetch")
    setUser(null)
    router.push("/auth/login")
    setMobileMenuOpen(false)
  }

  if (!mounted) {
    return null
  }

  const navLinks = [
    { href: "/candidate/dashboard", label: t('common.home'), icon: Home },
    { href: "/candidate/jobs", label: t('common.jobs'), icon: Briefcase },
    { href: "/candidate/community", label: "Community", icon: Users },
    { href: "/candidate/saved-jobs", label: t('common.savedJobs'), icon: Bookmark },
    { href: "/candidate/interested-jobs", label: t('common.interestedJobs'), icon: Heart },
    { href: "/candidate/roadmap", label: t('common.roadmap'), icon: TrendingUp },
    { href: "/candidate/courses", label: "Courses", icon: BookOpen },
    { href: "/candidate/interview", label: "Interview", icon: MessageCircle },
    { href: "/candidate/inbox", label: "Inbox", icon: Inbox },
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "sticky top-0 z-[100] w-full transition-all duration-200 border-b",
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-teal-100/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={user ? "/candidate/dashboard" : "/"}
          className="flex items-center gap-2 group relative z-50"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 transition-all group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-teal-500/40">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 group-hover:text-teal-600 transition-colors hidden xs:block">
            {t('common.appName')}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/50 backdrop-blur-md px-2 py-1.5 rounded-full border border-teal-50/50 shadow-sm mx-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 relative overflow-hidden group",
                isActive(link.href)
                  ? "text-teal-700 font-bold"
                  : "text-slate-500 hover:text-teal-600"
              )}
            >
              {isActive(link.href) && (
                <motion.div
                  layoutId="common-navbar-indicator"
                  className="absolute inset-0 bg-teal-50 rounded-full border border-teal-100"
                  initial={false}
                  transition={{
                    type: "spring",
                    bounce: 0.12,
                    duration: 0.35,
                    stiffness: 350,
                    damping: 35
                  }}
                  style={{ willChange: 'transform' }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <link.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive(link.href) ? "fill-current" : "")} />
                {link.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-3 cursor-pointer group">
                  <div className="text-right hidden xl:block transition-opacity group-hover:opacity-80">
                    <div className="text-sm font-bold text-slate-800 leading-none">{user.fullName || "User"}</div>
                    <div className="text-[10px] text-teal-600 font-bold uppercase tracking-wider mt-1">{user.role}</div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-teal-500 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity"></div>
                    <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-2 ring-teal-50 group-hover:ring-teal-200 transition-all">
                      <AvatarFallback className="bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 font-black">
                        {user.fullName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-4 p-2 rounded-2xl border-teal-100 shadow-xl bg-white/90 backdrop-blur-xl">
                <DropdownMenuLabel className="font-normal px-2 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none text-slate-800">{user.fullName}</p>
                    <p className="text-xs leading-none text-slate-400 font-mono">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-teal-50" />
                <DropdownMenuItem onClick={() => router.push('/candidate/profile')} className="rounded-xl cursor-pointer hover:bg-teal-50 hover:text-teal-700 focus:bg-teal-50 focus:text-teal-700 transition-colors">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/candidate/settings')} className="rounded-xl cursor-pointer hover:bg-teal-50 hover:text-teal-700 focus:bg-teal-50 focus:text-teal-700 transition-colors">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-teal-50" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-600 hover:text-teal-600 hover:bg-teal-50/50 font-semibold rounded-full">
                  {t('common.signIn')}
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
                  {t('common.postJob')}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button - Glassy */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2.5 rounded-xl text-slate-600 hover:bg-teal-50/50 hover:text-teal-600 transition-colors border border-transparent hover:border-teal-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Menu Drawer - Enhanced */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-[300px] z-[201] bg-white/95 backdrop-blur-2xl shadow-2xl border-l border-white/20 flex flex-col lg:hidden"
            >
              <div className="p-5 border-b border-gray-100/50 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-500" /> Menu
                </span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      prefetch={true}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-medium border border-transparent",
                        isActive(link.href)
                          ? "bg-teal-50 text-teal-700 border-teal-100 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <link.icon className={cn("h-5 w-5", isActive(link.href) ? "text-teal-600 fill-teal-200" : "text-slate-400")} />
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="p-5 border-t border-gray-100/50 bg-gray-50/50">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <Avatar className="h-10 w-10 border border-teal-100">
                        <AvatarFallback className="bg-teal-50 text-teal-700 font-black">
                          {user.fullName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{user.fullName}</p>
                        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                      </div>
                    </div>
                    <Button onClick={handleLogout} variant="destructive" className="w-full justify-start text-red-600 bg-red-50 hover:bg-red-100 border-none shadow-none rounded-xl h-11">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="w-full border-gray-200 rounded-xl h-11" onClick={() => router.push('/auth/login')}>Log In</Button>
                    <Button className="w-full bg-slate-900 text-white rounded-xl h-11" onClick={() => router.push('/auth/signup')}>Sign Up</Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

