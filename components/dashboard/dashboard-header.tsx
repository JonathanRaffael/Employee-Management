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
import { LogOut, Settings, User, Bell, Sun, Moon, Monitor } from "lucide-react"
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

export default function DashboardHeader({ user }: { user: UserType }) {
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState<Theme>("system")
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
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
              <img src="images/Logo.jpg" alt="Logo PT Hang Tong Manufactory" className="w-6 h-6 rounded-full" />
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
                {theme === "light" && (
                  <div className="ml-auto h-2 w-2 bg-teal-500 rounded-full"></div>
                )}
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
                {theme === "dark" && (
                  <div className="ml-auto h-2 w-2 bg-teal-500 rounded-full"></div>
                )}
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
                {theme === "system" && (
                  <div className="ml-auto h-2 w-2 bg-teal-500 rounded-full"></div>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-600 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400"
          >
            <Bell size={20} />
            <span className="absolute top-0 right-0 h-2 w-2 bg-teal-500 rounded-full"></span>
          </Button>

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

              <DropdownMenuItem className="flex items-center p-3 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors duration-200">
                <User className="mr-3 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span>My Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center p-3 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors duration-200">
                <Settings className="mr-3 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span>Settings</span>
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