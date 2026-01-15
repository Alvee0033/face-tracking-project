"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Zap, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
}

export function Header({ title, showBack = false, backHref }: HeaderProps) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  if (!mounted) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border/50 glass">
        <div className="container flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded bg-primary">
              <Zap className="h-2.5 w-2.5 fill-white stroke-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Jobsite</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 glass">
      <div className="container flex h-12 items-center justify-between px-3">
        <div className="flex items-center gap-2">
          {showBack && backHref ? (
            <Link href={backHref}>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="h-[14px] w-[14px]" />
              </button>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-primary">
                <Zap className="h-2.5 w-2.5 fill-white stroke-white" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold tracking-tight">Jobsite</span>
            </Link>
          )}
        </div>

        {title && (
          <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold">
            {title}
          </h1>
        )}

        {/* User Avatar and Name or Theme Toggle */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold leading-tight truncate max-w-[120px]">
                {user.fullName || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {user.role}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <User className="h-4 w-4 text-primary" />
            </div>
          </div>
        ) : (
          <ThemeToggle />
        )}
      </div>
    </header>
  )
}

