"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  LogOut,
  Menu,
  X,
  Bell,
  UserPlus,
  Mail,
  User,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { profileAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function RecruiterNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const mobileBellButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const [isDesktop, setIsDesktop] = useState(false);

  // Sidebar menu items
  const navItems = [
    {
      href: "/recruiter/dashboard",
      labelKey: "navigation.dashboard",
      icon: () => (
        <div className="w-5 h-5 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current rounded"></div>
        </div>
      ),
    },
    { href: "/recruiter/jobs", labelKey: "navigation.jobPostings", icon: Briefcase },
    { href: "/recruiter/profile", labelKey: "common.profile", icon: User },
    { href: "/recruiter/jobs/new", labelKey: "navigation.postJob", icon: PlusCircle },
  ];

  // Recent Activity Data
  const recentActivity = [
    {
      id: 1,
      type: "application",
      icon: UserPlus,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      message: (
        <>
          <span className="font-medium">Jane Doe</span> applied for{" "}
          <span className="font-medium">Senior Product Designer</span>.
        </>
      ),
      time: "2 minutes ago",
    },
    {
      id: 2,
      type: "message",
      icon: Mail,
      iconColor: "text-teal-600",
      bgColor: "bg-teal-100",
      message: (
        <>
          New message from <span className="font-medium">Mike Ross</span>.
        </>
      ),
      time: "15 minutes ago",
    },
    {
      id: 3,
      type: "application",
      icon: UserPlus,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      message: (
        <>
          <span className="font-medium">Sam Wilson</span> applied for{" "}
          <span className="font-medium">Software Engineer</span>.
        </>
      ),
      time: "1 hour ago",
    },
  ];

  useEffect(() => {
    setMounted(true);
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      fetchRecruiterProfile(userData.id);
    }

    // Check if desktop on mount and resize
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Calculate dropdown position when opened (both mobile and desktop)
  useEffect(() => {
    if (notificationOpen) {
      // Get the active bell button (desktop or mobile)
      const activeButton = isDesktop ? bellButtonRef.current : mobileBellButtonRef.current;

      if (activeButton) {
        const rect = activeButton.getBoundingClientRect();
        // For desktop, position dropdown slightly to the left of bell button
        // Calculate right position: distance from right edge of window to right edge of button, plus small offset
        setDropdownPosition({
          top: rect.bottom + 8, // 8px gap below button
          right: Math.max(8, window.innerWidth - rect.right + 16), // Slight left offset (16px), min 8px from edge
        });
      }
    }
  }, [notificationOpen, isDesktop]);

  // Close notification dropdown when clicking outside (mobile) or mouse leaves area (desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const activeButton = window.innerWidth >= 768 ? bellButtonRef.current : mobileBellButtonRef.current;

      // On mobile, close on any click outside
      if (window.innerWidth < 768) {
        if (
          notificationRef.current &&
          activeButton &&
          !notificationRef.current.contains(event.target as Node) &&
          !activeButton.contains(event.target as Node)
        ) {
          setNotificationOpen(false);
        }
      }
      // On desktop, only close on click outside (hover keeps it open)
      else if (
        notificationRef.current &&
        activeButton &&
        !notificationRef.current.contains(event.target as Node) &&
        !activeButton.contains(event.target as Node)
      ) {
        // Don't close on click if we're using hover behavior
        // Only close if explicitly clicking outside
        setNotificationOpen(false);
      }
    };

    const handleMouseLeave = () => {
      // On desktop, close when mouse leaves both button and dropdown
      if (window.innerWidth >= 768) {
        setTimeout(() => {
          if (notificationRef.current && bellButtonRef.current) {
            // Check if mouse is still over button or dropdown
            const isOverButton = bellButtonRef.current.matches(":hover");
            const isOverDropdown = notificationRef.current.matches(":hover");
            if (!isOverButton && !isOverDropdown) {
              setNotificationOpen(false);
            }
          }
        }, 100); // Small delay to allow mouse to move between button and dropdown
      }
    };

    if (notificationOpen) {
      // Add a small delay to prevent immediate closure
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
        if (
          window.innerWidth >= 768 &&
          bellButtonRef.current &&
          notificationRef.current
        ) {
          const container = document.createElement("div");
          // Use a wrapper approach for hover detection
          bellButtonRef.current.addEventListener(
            "mouseleave",
            handleMouseLeave
          );
          notificationRef.current.addEventListener(
            "mouseleave",
            handleMouseLeave
          );
        }
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (bellButtonRef.current) {
        bellButtonRef.current.removeEventListener(
          "mouseleave",
          handleMouseLeave
        );
      }
      if (notificationRef.current) {
        notificationRef.current.removeEventListener(
          "mouseleave",
          handleMouseLeave
        );
      }
    };
  }, [notificationOpen]);

  // Prevent body scroll when notification is open (for mobile only)
  useEffect(() => {
    if (
      notificationOpen &&
      typeof window !== "undefined" &&
      window.innerWidth < 768
    ) {
      // Only prevent vertical scroll on mobile, preserve horizontal layout
      document.body.style.overflowY = "hidden";
      // Prevent horizontal overflow
      document.body.style.overflowX = "hidden";
    } else {
      document.body.style.overflowY = "";
      document.body.style.overflowX = "";
    }
    return () => {
      document.body.style.overflowY = "";
      document.body.style.overflowX = "";
    };
  }, [notificationOpen]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      // Prevent vertical scroll, preserve horizontal layout
      document.body.style.overflowY = "hidden";
      // Prevent horizontal overflow
      document.body.style.overflowX = "hidden";
    } else {
      document.body.style.overflowY = "";
      document.body.style.overflowX = "";
    }
    return () => {
      document.body.style.overflowY = "";
      document.body.style.overflowX = "";
    };
  }, [mobileMenuOpen]);

  const fetchRecruiterProfile = async (userId: string) => {
    try {
      const response = await profileAPI.getRecruiter(userId);
      if (response.data.recruiterProfile) {
        setRecruiterProfile(response.data.recruiterProfile);
      }
    } catch (err) {
      console.error("Failed to fetch recruiter profile:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("profile_last_fetch");
    setUser(null);
    router.push("/auth/login");
    setMobileMenuOpen(false);
  };

  // Get display name and role
  const displayName =
    user?.fullName || user?.email?.split("@")[0] || "Recruiter";
  const displayRole = recruiterProfile?.company_name || "Hiring Manager";

  if (!mounted) {
    return null;
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-[100] w-full border-b border-white/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/recruiter/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/25">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-transparent">
              {t('common.appName')}
            </span>
          </Link>

          {/* Desktop Right Actions - Profile Card & Logout */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <LanguageSwitcher />
            {/* Profile Card */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {displayName}
                </span>
              </div>
            </div>

            {/* Notification Button - Visible on both mobile and desktop */}
            <div className="relative">
              <button
                ref={bellButtonRef}
                onClick={() => {
                  // Toggle notification on click for both mobile and desktop
                  setNotificationOpen(!notificationOpen);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-700" />
                {recentActivity.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all duration-300 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            {/* Notification Button - Visible on both mobile and desktop */}
            <div className="relative md:hidden">
              <button
                ref={mobileBellButtonRef}
                onClick={() => {
                  // Toggle notification on click for both mobile and desktop
                  setNotificationOpen(!notificationOpen);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-700" />
                {recentActivity.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Side Drawer */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[2147483647] md:hidden ${mobileMenuOpen ? "" : "pointer-events-none"
              }`}
            aria-hidden={!mobileMenuOpen}
          >
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0"
                }`}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div
              className={`fixed right-0 top-0 h-screen w-80 max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ease-in-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
                <h2 className="text-lg font-semibold text-gray-900">{t('common.menu')}</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto">
                {/* Profile Card */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {displayRole}
                    </span>
                  </div>
                </div>

                {/* Navigation Items */}
                <nav className="p-4 space-y-1">
                  <div className="px-3 py-2">
                    <LanguageSwitcher />
                  </div>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/recruiter/dashboard" &&
                        pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-sm",
                          isActive
                            ? "bg-primary/10 text-primary font-bold shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", isActive ? "animate-pulse" : "")} />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Logout Button */}
                <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Notification Dropdown via Portal - Both Mobile & Desktop */}
      {mounted &&
        notificationOpen &&
        createPortal(
          <>
            {/* Backdrop for mobile only */}
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-[9998] transition-opacity duration-200"
              onClick={() => setNotificationOpen(false)}
            />

            {/* Notification Dropdown */}
            <div
              ref={notificationRef}
              className="fixed z-[9999] w-64 lg:w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden flex flex-col"
              style={{
                top: `${dropdownPosition.top}px`,
                ...(isDesktop
                  ? {
                    right: `${dropdownPosition.right}px`,
                    left: 'auto',
                    transform: 'none'
                  }
                  : {
                    left: '50%',
                    transform: 'translateX(-50%)',
                    right: 'auto'
                  }
                ),
                maxHeight: isDesktop ? "24rem" : "calc(100vh - 120px)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 lg:py-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-20">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900">
                  Your Notification
                </h3>
                <button
                  onClick={() => setNotificationOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer "
                  aria-label="Close notifications"
                >
                  <X className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              {/* Content */}
              <div className="p-2 overflow-y-auto flex-1">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-full ${activity.bgColor} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`h-4 w-4 ${activity.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs lg:text-sm text-gray-700">
                            {activity.message}
                          </p>
                          <p className="text-[0.6rem] lg:text-xs text-gray-500 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </header>
  );
}
