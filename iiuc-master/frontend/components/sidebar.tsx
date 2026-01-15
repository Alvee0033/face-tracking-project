"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  User,
  Briefcase,
  LogOut,
  Menu,
  X,
  Zap,
  Settings,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Star,
  GraduationCap,
  Award,
  FolderOpen,
  UserCheck,
  Bookmark,
  Heart,
  TrendingUp,
  FileText
} from "lucide-react"
import NProgress from "nprogress"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

interface SidebarProps {
  role: "candidate" | "recruiter"
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

interface NavItem {
  href: string
  label: string
  icon: any
  hasSubItems?: boolean
  subItems?: NavItem[]
}

export function Sidebar({ role, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isProfileExpanded, setIsProfileExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }

    // Auto-expand profile section if on a profile sub-page
    if (pathname.startsWith('/candidate/profile/')) {
      setIsProfileExpanded(true)
    }

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
  }, [pathname])

  // Profile sub-categories for candidates
  const profileSubCategories: NavItem[] = [
    { href: "/candidate/profile/edit/basic", label: t('profile.basicInfo'), icon: User },
    { href: "/candidate/profile/skills", label: t('profile.skills'), icon: Star },
    { href: "/candidate/profile/experience", label: t('profile.experience'), icon: Briefcase },
    { href: "/candidate/profile/education", label: t('profile.education'), icon: GraduationCap },
    { href: "/candidate/profile/projects", label: t('profile.projects'), icon: FolderOpen },
    { href: "/candidate/profile/certifications", label: t('profile.certifications'), icon: Award },
    { href: "/candidate/profile/preferences", label: t('profile.preferences'), icon: Settings },
    { href: "/candidate/cv", label: "CV Builder", icon: FileText },
  ]

  const candidateNav: NavItem[] = [
    { href: "/candidate/dashboard", label: "Dashboard", icon: Home },
    { href: "/candidate/jobs", label: "Browse Jobs", icon: Briefcase },
    { href: "/candidate/saved-jobs", label: "Saved Jobs", icon: Bookmark },
    { href: "/candidate/interested-jobs", label: "Interested Jobs", icon: Heart },
    { href: "/candidate/roadmap", label: "Learning Roadmap", icon: TrendingUp },
    {
      href: "/candidate/profile/edit",
      label: "Profile",
      icon: User,
      hasSubItems: true,
      subItems: profileSubCategories
    },
  ]

  const recruiterNav: NavItem[] = [
    { href: "/recruiter/dashboard", label: "Dashboard", icon: Home },
    { href: "/recruiter/jobs", label: "My Jobs", icon: Briefcase },
    { href: "/recruiter/jobs/new", label: "Post Job", icon: PlusCircle },
    { href: "/recruiter/profile/setup", label: "Profile", icon: User },
  ]

  const navItems = role === "candidate" ? candidateNav : recruiterNav

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  const closeMobile = () => setIsMobileOpen(false)

  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar - Fully Opaque */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[280px] transition-transform duration-300 ease-in-out",
          // Mobile: slide in from left
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: isDark ? 'hsl(250, 30%, 8%)' : 'hsl(250, 30%, 98%)',
          borderRight: isDark ? '1px solid hsl(250, 25%, 20%)' : '1px solid hsl(250, 30%, 88%)',
          boxShadow: isDark
            ? '2px 0 10px rgba(99, 63, 243, 0.05)'
            : '2px 0 10px rgba(99, 63, 243, 0.08)'
        }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border/50">
            <Link href="/" className="flex items-center gap-2" onClick={closeMobile}>
              <Zap
                className="h-6 w-6"
                strokeWidth={2}
                style={{
                  fill: '#633ff3',
                  stroke: '#633ff3'
                }}
              />
              <span className="text-lg font-bold tracking-tight">Jobsite</span>
            </Link>

            {/* Close button for mobile */}
            <button
              onClick={closeMobile}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = item.icon
                const isProfileItem = item.href === "/candidate/profile/edit"
                const shouldShowSubItems = isProfileItem && isProfileExpanded

                return (
                  <li key={item.href}>
                    {/* Main Navigation Item */}
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={() => {
                          closeMobile()
                          NProgress.start()
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all flex-1",
                          isActive
                            ? isDark
                              ? "bg-primary/20 shadow-md"
                              : "bg-primary/10 shadow-sm"
                            : isDark
                              ? "hover:bg-primary/15 hover:shadow-sm"
                              : "hover:bg-primary/8 hover:shadow-sm"
                        )}
                        style={{ color: '#633ff3' }}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2} />
                        <span>{item.label}</span>
                      </Link>

                      {/* Expand/Collapse Button for Profile */}
                      {item.hasSubItems && (
                        <button
                          onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          {isProfileExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Profile Sub-Categories */}
                    {item.hasSubItems && shouldShowSubItems && (
                      <ul className="ml-6 mt-1 space-y-1">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href
                          const SubIcon = subItem.icon

                          return (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                onClick={() => {
                                  closeMobile()
                                  NProgress.start()
                                }}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                                  isSubActive
                                    ? isDark
                                      ? "bg-primary/15 text-primary font-medium"
                                      : "bg-primary/8 text-primary font-medium"
                                    : isDark
                                      ? "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                                      : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <SubIcon className="h-4 w-4" strokeWidth={2} />
                                <span>{subItem.label}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-border/50 p-3 space-y-2">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" strokeWidth={2} />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
