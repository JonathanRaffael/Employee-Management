"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, Bell, Sun, Moon, Monitor, X } from "lucide-react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type UserType = {
  name?: string
  email?: string
  image?: string
}

type Theme = "light" | "dark" | "system"

type NotificationType = {
  id: string
  title: string
  message?: string
  isRead: boolean
  createdAt: string
}

export default function DashboardHeader({ user }: { user: UserType }) {
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState<Theme>("system")
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const [notifications, setNotifications] = useState<NotificationType[]>([])

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications")
        if (res.ok) {
          const data = await res.json()
          setNotifications(data)
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err)
      }
    }

    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Theme management
  useEffect(() => {
    // Get saved theme from localStorage or default to system
    const savedTheme = (localStorage.getItem("theme") as Theme) || "system"
    setTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.toggle("dark", systemTheme === "dark")
    } else {
      root.classList.toggle("dark", newTheme === "dark")
    }

    localStorage.setItem("theme", newTheme)
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  // Listen for system theme changes when theme is set to system
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

      const handleChange = () => {
        if (theme === "system") {
          applyTheme("system")
        }
      }

      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme])

  // If no user, don't render
  if (!user) return null

  const handleSignOut = () => {
    setShowLogoutDialog(true)
  }

  const confirmLogout = () => {
    console.log("User is logging out...")
    signOut({ callbackUrl: "/" })
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun size={16} />
      case "dark":
        return <Moon size={16} />
      case "system":
        return <Monitor size={16} />
      default:
        return <Monitor size={16} />
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif)))
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead)

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: notification.id }),
          }),
        ),
      )

      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })))
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const getNotificationIcon = () => {
    return <Bell className="h-4 w-4 text-teal-500" />
  }

  const formatNotificationTime = (createdAt: string) => {
    const now = new Date()
    const notificationTime = new Date(createdAt)
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-teal-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-300 ${
        scrolled ? "shadow-md" : "shadow-none"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Brand Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <Link
            href="/dashboard"
            className="font-bold text-xl bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent hover:from-teal-700 hover:to-cyan-700 dark:hover:from-teal-300 dark:hover:to-cyan-300 transition-colors duration-200 flex items-center"
          >
            <div className="mr-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-1 rounded-full">
              <img src="images/logo-cropped.png" alt="Logo PT Hang Tong Manufactory" className="w-6 h-6 rounded-full" />
            </div>
            <span className="hidden md:inline">PT HANG TONG MANUFACTORY</span>
            <span className="md:hidden">HT MFG</span>
          </Link>
        </div>

        {/* User Controls */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400 transition-colors duration-200"
                aria-label="Theme selector"
              >
                {getThemeIcon()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 dark:bg-slate-800 dark:text-slate-200 mt-1 p-2 rounded-lg shadow-lg border border-teal-100 dark:border-slate-700"
              align="end"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-teal-100 dark:bg-slate-700" />

              <DropdownMenuItem
                onClick={() => handleThemeChange("light")}
                className={`flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors duration-200 ${
                  theme === "light"
                    ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                    : "hover:bg-teal-50 dark:hover:bg-teal-900/20"
                }`}
              >
                <Sun className="mr-3 h-4 w-4" />
                <span>Light</span>
                {theme === "light" && <div className="ml-auto h-2 w-2 bg-teal-500 rounded-full"></div>}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleThemeChange("dark")}
                className={`flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors duration-200 ${
                  theme === "dark"
                    ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                    : "hover:bg-teal-50 dark:hover:bg-teal-900/20"
                }`}
              >
                <Moon className="mr-3 h-4 w-4" />
                <span>Dark</span>
                {theme === "dark" && <div className="ml-auto h-2 w-2 bg-teal-500 rounded-full"></div>}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleThemeChange("system")}
                className={`flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors duration-200 ${
                  theme === "system"
                    ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                    : "hover:bg-teal-50 dark:hover:bg-teal-900/20"
                }`}
              >
                <Monitor className="mr-3 h-4 w-4" />
                <span>System</span>
                {theme === "system" && <div className="ml-auto h-2 w-2 bg-teal-500 rounded-full"></div>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-600 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-80 dark:bg-slate-800 dark:text-slate-200 mt-1 p-0 rounded-lg shadow-lg border border-teal-100 dark:border-slate-700"
              align="end"
            >
              <div className="p-4 border-b border-teal-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">No notifications</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                        !notification.isRead ? "bg-teal-50/50 dark:bg-teal-900/10" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon()}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {notification.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatNotificationTime(notification.createdAt)}
                            </p>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-teal-600 hover:text-teal-700 h-6 px-2"
                              >
                                Mark read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full border border-teal-200 dark:border-teal-800 overflow-hidden hover:border-teal-500 dark:hover:border-teal-400 transition-all duration-200"
                aria-label="User menu"
              >
                <Avatar className="h-full w-full">
                  {user.image && <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name || "User"} />}
                  <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-300 font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-64 dark:bg-slate-800 dark:text-slate-200 mt-1 p-2 rounded-lg shadow-lg border border-teal-100 dark:border-slate-700"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">
                    {user.name || "Unknown User"}
                  </p>
                  <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                    {user.email || "No email provided"}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-teal-100 dark:bg-slate-700" />

              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center p-3 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors duration-200"
                >
                  <User className="mr-3 h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center p-3 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors duration-200"
                >
                  <Settings className="mr-3 h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-teal-100 dark:bg-slate-700" />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center p-3 cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors duration-200"
                aria-label="Log out"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <LogOut className="h-5 w-5 text-red-500" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmLogout}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
