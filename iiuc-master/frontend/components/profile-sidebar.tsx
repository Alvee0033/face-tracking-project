"use client"

import { User, Briefcase, GraduationCap, Award, FolderOpen, Star, Settings, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/components/language-provider"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface ProfileSidebarProps {
  user: {
    fullName?: string
    email?: string
    profilePictureUrl?: string
  }
}

export function ProfileSidebar({ user }: ProfileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()

  const navItems = [
    { href: "/candidate/profile/edit/basic", labelKey: "profile.basicInfo", icon: User },
    { href: "/candidate/profile/skills", labelKey: "profile.skills", icon: Star },
    { href: "/candidate/profile/experience", labelKey: "profile.experience", icon: Briefcase },
    { href: "/candidate/profile/education", labelKey: "profile.education", icon: GraduationCap },
    { href: "/candidate/profile/projects", labelKey: "profile.projects", icon: FolderOpen },
    { href: "/candidate/profile/certifications", labelKey: "profile.certifications", icon: Award },
    { href: "/candidate/profile/preferences", labelKey: "profile.preferences", icon: Settings },
    { href: "/candidate/cv", labelKey: "CV Builder", icon: FileText },
  ]

  return (
    <Card className="p-6 bg-white border border-gray-200 sticky top-20 self-start">
      {/* User Info */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
        <div className="flex-shrink-0">
          {user.profilePictureUrl ? (
            <img
              src={user.profilePictureUrl}
              alt={user.fullName || "Profile"}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center border-2 border-teal-100">
              <User className="h-6 w-6 text-teal-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {user.fullName || "John Doe"}
          </h3>
          <p className="text-xs text-gray-600 truncate">
            {user.email || "john.doe@email.com"}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-2 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href === "/candidate/profile/edit/basic" && pathname === "/candidate/profile/edit") ||
            (item.href === "/candidate/cv" && pathname.startsWith("/candidate/cv"))

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative group block"
            >
              <div className={`relative z-10 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                ? 'text-teal-700 font-semibold'
                : 'text-gray-600 hover:text-teal-600'
                }`}>
                {isActive && (
                  <motion.div
                    layoutId="profile-sidebar-active"
                    className="absolute inset-0 bg-teal-50 rounded-xl -z-10 shadow-sm border border-teal-100/50"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? 'text-teal-600' : 'text-gray-400 group-hover:text-teal-500'}`} />
                <span className="text-sm">{t(item.labelKey)}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* View Profile Button */}
      <Button
        className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
        onClick={() => router.push("/candidate/profile/edit")}
      >
        {t('profile.viewProfile')}
      </Button>
    </Card>
  )
}

