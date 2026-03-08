"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { User, LogOut, Settings } from "lucide-react"

interface ProfileDropdownProps {
  user: any
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Initialize profile picture immediately from user prop to prevent flash
  const profilePicture = user?.profile_picture_url || user?.profilePictureUrl || null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && 
          buttonRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap
        right: window.innerWidth - rect.right
      })
    }
  }, [isOpen])

  useEffect(() => {
    // Check theme
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    localStorage.removeItem("profile_last_fetch")
    router.push("/auth/login")
  }

  const dropdownContent = isOpen && mounted && (
    <div 
      ref={dropdownRef}
      className="fixed w-56 rounded-lg shadow-2xl"
      style={{
        backgroundColor: isDark ? '#17141f' : '#f4f2fb',
        borderColor: isDark ? '#2d2733' : '#dcd6f0',
        borderWidth: '1px',
        borderStyle: 'solid',
        zIndex: 9999,
        top: `${dropdownPosition.top}px`,
        right: `${dropdownPosition.right}px`
      }}
    >
      {/* User Info */}
      <div 
        className="px-4 py-3"
        style={{
          borderBottomColor: isDark ? '#2d2733' : '#dcd6f0',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid'
        }}
      >
        <p 
          className="text-sm font-semibold truncate"
          style={{ color: isDark ? '#f2f1f5' : '#171a26' }}
        >
          {user?.fullName || "User"}
        </p>
        <p 
          className="text-xs truncate"
          style={{ color: isDark ? '#969199' : '#656d81' }}
        >
          {user?.email}
        </p>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <button
          onClick={() => {
            setIsOpen(false)
            router.push(`/${user?.role}/profile/edit`)
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
          style={{ color: isDark ? '#f2f1f5' : '#171a26' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? '#1d1a26' : '#eeebf9'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
          style={{ color: '#ef4343' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 67, 67, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Avatar Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          console.log('Avatar clicked, isOpen will be:', !isOpen)
          setIsOpen(!isOpen)
        }}
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-semibold leading-tight text-white truncate max-w-[120px]">
            {user?.fullName || "User"}
          </span>
          <span className="text-[10px] text-white/80 capitalize">
            {user?.role}
          </span>
        </div>
        {profilePicture ? (
          <img 
            src={profilePicture} 
            alt={user?.fullName || "User"} 
            className="h-8 w-8 rounded-full object-cover border border-white/30"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/30">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </button>

      {/* Render dropdown via portal to avoid clipping */}
      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  )
}
