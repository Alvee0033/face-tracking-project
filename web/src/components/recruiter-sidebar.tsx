"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Briefcase, User, PlusCircle, MessageSquare, Inbox, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"

import NProgress from "nprogress"

export function RecruiterSidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const navItems = [
    { href: "/recruiter/dashboard", labelKey: "navigation.dashboard", icon: ({ className }: any) => <div className={cn("w-5 h-5 flex items-center justify-center", className)}><div className="w-4 h-4 border-2 border-current rounded"></div></div> },
    { href: "/recruiter/jobs", labelKey: "navigation.jobPostings", icon: Briefcase },
    { href: "/recruiter/applications", label: "Applicants", icon: Users },

    { href: "/recruiter/interview", label: "Interview", icon: MessageSquare },
    { href: "/recruiter/inbox", label: "Inbox", icon: Inbox },
    { href: "/recruiter/profile", labelKey: "common.profile", icon: User },
    { href: "/recruiter/jobs/new", labelKey: "navigation.postJob", icon: PlusCircle },
  ]

  return (
    <div className="hidden lg:block lg:col-span-2">
      <Card className="p-4 bg-white/95 backdrop-blur-sm border border-gray-200/50 sticky top-24 self-start shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-100/30 to-cyan-100/30 blur-3xl -z-10 translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-50/40 to-emerald-50/40 blur-2xl -z-10 -translate-x-8 translate-y-8" />

        <nav className="space-y-1.5 relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/recruiter/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => NProgress.start()}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/30"
                    : "text-gray-700 hover:text-teal-600 hover:bg-teal-50/80"
                )}
              >
                <div className="relative z-10 flex items-center gap-3 w-full">
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-300 group-hover:scale-110",
                    isActive ? "text-white" : "text-gray-600 group-hover:text-teal-600"
                  )} />
                  <span className="font-medium">{item.labelKey ? t(item.labelKey) : item.label}</span>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-3 w-2 h-2 rounded-full bg-white shadow-sm animate-pulse" />
                )}

                {/* Hover effect */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 to-cyan-500/0 group-hover:from-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-300 rounded-xl" />
                )}
              </Link>
            )
          })}
        </nav>
      </Card>
    </div>
  )
}
