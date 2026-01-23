"use client"

import { ReactNode, useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { profileAPI } from "@/lib/api"
import { Menu, User } from "lucide-react"

interface DashboardLayoutProps {
  children: ReactNode
  role: "candidate" | "recruiter"
  title?: string
  showBack?: boolean
  backHref?: string
}

export function DashboardLayout({ 
  children, 
  role,
  title,
  showBack = false,
  backHref
}: DashboardLayoutProps) {
  // Initialize user from localStorage immediately to prevent flash
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem("user")
      return userStr ? JSON.parse(userStr) : null
    }
    return null
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    // Check if we need to fetch profile data (cache for 5 minutes)
    if (user) {
      const lastFetch = localStorage.getItem("profile_last_fetch")
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      
      if (!lastFetch || now - parseInt(lastFetch) > fiveMinutes) {
        fetchLatestProfile(user)
      }
    }
    
    // Watch for theme changes
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const fetchLatestProfile = async (userData: any) => {
    try {
      if (role === 'candidate') {
        const response = await profileAPI.getCandidate(userData.id)
        if (response.data.profile) {
          // Update user with profile picture
          const updatedUser = {
            ...userData,
            profile_picture_url: response.data.profile.profile_picture_url,
            phone_number: response.data.profile.phone_number
          }
          setUser(updatedUser)
          
          // Cache the updated user data and timestamp
          localStorage.setItem("user", JSON.stringify(updatedUser))
          localStorage.setItem("profile_last_fetch", Date.now().toString())
        }
      } else if (role === 'recruiter') {
        const response = await profileAPI.getRecruiter(userData.id)
        if (response.data.profile) {
          // Update user with phone number
          const updatedUser = {
            ...userData,
            phone_number: response.data.profile.phone_number
          }
          setUser(updatedUser)
          
          // Cache the updated user data and timestamp
          localStorage.setItem("user", JSON.stringify(updatedUser))
          localStorage.setItem("profile_last_fetch", Date.now().toString())
        }
      }
    } catch (err) {
      console.error('Failed to fetch latest profile:', err)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar role={role} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[280px] overflow-visible">
        {/* Mobile Header - Purple with hamburger */}
        <header 
          className="lg:hidden sticky top-0 z-40 w-full border-b border-white/20 overflow-visible"
          style={{ backgroundColor: isDark ? '#1a1428' : '#633ff3' }}
        >
          <div className="flex h-14 items-center justify-between px-3 overflow-visible">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
            
            {title && (
              <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-white">
                {title}
              </h1>
            )}
            
            {/* User Avatar with Dropdown */}
            {user && <ProfileDropdown user={user} />}
          </div>
        </header>
        
        {/* Desktop Header - with user info */}
        <header 
          className="hidden lg:block sticky top-0 z-40 w-full border-b border-white/20 overflow-visible"
          style={{ backgroundColor: isDark ? '#1a1428' : '#633ff3' }}
        >
          <div className="flex h-16 items-center justify-between px-8 overflow-visible">
            {title && <h1 className="text-xl font-bold text-white">{title}</h1>}
            {!title && <div />}
            
            {/* User Avatar with Dropdown */}
            {user && <ProfileDropdown user={user} />}
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)] relative z-0">
          {children}
        </main>
      </div>
    </div>
  )
}
