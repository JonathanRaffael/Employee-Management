"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { Eye, EyeOff, Lock, Mail, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "framer-motion"
import HRIllustration from "@/components/hr-illustration"

// Pre-generate star positions to avoid hydration errors
const starPositions = Array(50)
  .fill(0)
  .map(() => ({
    top: Math.floor(Math.random() * 100),
    left: Math.floor(Math.random() * 100),
    width: Math.floor(Math.random() * 3) + 1,
    height: Math.floor(Math.random() * 3) + 1,
    delay: Math.floor(Math.random() * 5),
    duration: Math.floor(Math.random() * 5) + 5,
  }))

// Replace the pre-generated particle positions with a simpler manufacturing-themed approach
const particlePositions = Array(8) // Reduced number of particles
  .fill(0)
  .map(() => ({
    top: Math.floor(Math.random() * 100),
    left: Math.floor(Math.random() * 100),
    delay: Math.floor(Math.random() * 5),
    duration: Math.floor(Math.random() * 10) + 10,
  }))

// Company logo formation timing
const logoFormationInterval = 15000 // 15 seconds between logo formations

// Update the Mascot component to fix the speech bubble visibility issue
const Mascot = ({ emotion, message, className = "" }: { emotion: string; message: string; className?: string }) => {
  const getEmoji = () => {
    switch (emotion) {
      case "happy":
        return "😊"
      case "excited":
        return "😎"
      case "confused":
        return "😵"
      case "sad":
        return "😭"
      case "thinking":
        return "🤔"
      case "wink":
        return "😉"
      default:
        return "😊"
    }
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`fixed z-50 flex items-center ${className}`}
    >
      <div className="relative flex items-center">
        <div className="text-4xl sm:text-5xl filter drop-shadow-md animate-bounce-slow">{getEmoji()}</div>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="ml-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-md text-xs sm:text-sm text-gray-700 dark:text-gray-300 max-w-[150px] sm:max-w-[200px] relative"
        >
          {message}
          <div className="absolute left-[-8px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[8px] border-r-white dark:border-r-slate-800 border-b-[8px] border-b-transparent"></div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Replace the ManufacturingParticle component with a simpler version
const ManufacturingIcon = ({ type, className = "" }: { type: string; className?: string }) => {
  return (
    <div className={`text-purple-500 dark:text-purple-400 ${className}`}>
      {type === "blueprint" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      )}
      {type === "assembly" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )}
      {type === "conveyor" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <polyline points="8 8 12 4 16 8" />
          <polyline points="16 16 12 20 8 16" />
        </svg>
      )}
    </div>
  )
}

// Replace the CompanyLogoParticles component with a simpler version
const ManufacturingBackground = () => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Professional geometric patterns */}
      <div className="absolute inset-0">
        {/* Blueprint grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAwIDIwIEwgNDAgMjAgTSAwIDMwIEwgNDAgMzAgTSAxMCAwIEwgMTAgNDAgTSAyMCAwIEwgMjAgNDAgTSAzMCAwIEwgMzAgNDAiIHN0cm9rZT0iIzYxNjE2MSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==')] opacity-10 dark:opacity-15"></div>

        {/* Animated circuit-like paths */}
        <svg className="absolute inset-0 w-full h-full opacity-10 dark:opacity-20" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,100 Q50,50 100,100 T200,100 T300,100 T400,100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-purple-500 dark:text-purple-400"
            strokeDasharray="5,5"
            strokeDashoffset="0"
          >
            <animate attributeName="strokeDashoffset" from="0" to="20" dur="3s" repeatCount="indefinite" />
          </path>
          <path
            d="M0,200 Q50,150 100,200 T200,200 T300,200 T400,200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500 dark:text-indigo-400"
            strokeDasharray="5,5"
            strokeDashoffset="0"
          >
            <animate attributeName="strokeDashoffset" from="0" to="20" dur="4s" repeatCount="indefinite" />
          </path>
          <path
            d="M100,0 Q150,50 100,100 T100,200 T100,300 T100,400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-purple-500 dark:text-purple-400"
            strokeDasharray="5,5"
            strokeDashoffset="0"
          >
            <animate attributeName="strokeDashoffset" from="0" to="20" dur="5s" repeatCount="indefinite" />
          </path>
          <path
            d="M300,0 Q250,50 300,100 T300,200 T300,300 T300,400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500 dark:text-indigo-400"
            strokeDasharray="5,5"
            strokeDashoffset="0"
          >
            <animate attributeName="strokeDashoffset" from="0" to="20" dur="6s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      {/* Professional manufacturing-themed elements */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 opacity-5 dark:opacity-10">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <g className="text-purple-600 dark:text-purple-400" fill="currentColor">
            <circle cx="100" cy="100" r="50" fillOpacity="0.2">
              <animate attributeName="r" values="50;55;50" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="100" r="40" fillOpacity="0.3">
              <animate attributeName="r" values="40;45;40" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="100" r="30" fillOpacity="0.4">
              <animate attributeName="r" values="30;35;30" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 opacity-5 dark:opacity-10">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <g className="text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="50" y="50" width="100" height="100" rx="10">
              <animate attributeName="width" values="100;110;100" dur="6s" repeatCount="indefinite" />
              <animate attributeName="height" values="100;110;100" dur="6s" repeatCount="indefinite" />
            </rect>
            <rect x="70" y="70" width="60" height="60" rx="5">
              <animate attributeName="width" values="60;65;60" dur="5s" repeatCount="indefinite" />
              <animate attributeName="height" values="60;65;60" dur="5s" repeatCount="indefinite" />
            </rect>
          </g>
        </svg>
      </div>

      {/* Animated gear elements */}
      <div className="absolute top-1/4 right-1/4 w-16 h-16 opacity-5 dark:opacity-10">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="animate-spin-slow">
          <path
            d="M50 15 L53 30 L68 30 L56 40 L60 55 L50 45 L40 55 L44 40 L32 30 L47 30 Z"
            className="text-purple-500 dark:text-purple-400"
            fill="currentColor"
          />
          <circle cx="50" cy="50" r="5" className="text-indigo-500 dark:text-indigo-400" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute bottom-1/4 left-1/4 w-20 h-20 opacity-5 dark:opacity-10">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="animate-spin-slow-reverse">
          <path
            d="M50 10 L55 25 L70 20 L60 35 L75 45 L55 45 L50 60 L45 45 L25 45 L40 35 L30 20 L45 25 Z"
            className="text-indigo-500 dark:text-indigo-400"
            fill="currentColor"
          />
          <circle cx="50" cy="50" r="8" className="text-purple-500 dark:text-purple-400" fill="currentColor" />
        </svg>
      </div>

      {/* Data flow lines */}
      <div className="absolute inset-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <line
            x1="0%"
            y1="20%"
            x2="100%"
            y2="20%"
            stroke="currentColor"
            strokeWidth="1"
            className="text-purple-500/10 dark:text-purple-400/10"
          >
            <animate attributeName="y1" values="20%;22%;20%" dur="10s" repeatCount="indefinite" />
            <animate attributeName="y2" values="20%;18%;20%" dur="10s" repeatCount="indefinite" />
          </line>
          <line
            x1="0%"
            y1="80%"
            x2="100%"
            y2="80%"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/10 dark:text-indigo-400/10"
          >
            <animate attributeName="y1" values="80%;78%;80%" dur="12s" repeatCount="indefinite" />
            <animate attributeName="y2" values="80%;82%;80%" dur="12s" repeatCount="indefinite" />
          </line>
          <line
            x1="20%"
            y1="0%"
            x2="20%"
            y2="100%"
            stroke="currentColor"
            strokeWidth="1"
            className="text-purple-500/10 dark:text-purple-400/10"
          >
            <animate attributeName="x1" values="20%;22%;20%" dur="11s" repeatCount="indefinite" />
            <animate attributeName="x2" values="20%;18%;20%" dur="11s" repeatCount="indefinite" />
          </line>
          <line
            x1="80%"
            y1="0%"
            x2="80%"
            y2="100%"
            stroke="currentColor"
            strokeWidth="1"
            className="text-indigo-500/10 dark:text-indigo-400/10"
          >
            <animate attributeName="x1" values="80%;78%;80%" dur="13s" repeatCount="indefinite" />
            <animate attributeName="x2" values="80%;82%;80%" dur="13s" repeatCount="indefinite" />
          </line>
        </svg>
      </div>

      {/* Digital particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/20 dark:bg-purple-400/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `digital-particle ${5 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Replace the ParticleExplosion component with a simpler version
const SuccessAnimation = ({ visible }: { visible: boolean }) => {
  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-40 h-40"
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeDasharray="283"
            strokeDashoffset="283"
          >
            <animate attributeName="stroke-dashoffset" from="283" to="0" dur="0.6s" fill="freeze" />
          </circle>
          <path
            d="M30 50 L45 65 L70 35"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeDasharray="75"
            strokeDashoffset="75"
          >
            <animate attributeName="stroke-dashoffset" from="75" to="0" dur="0.3s" begin="0.6s" fill="freeze" />
          </path>
        </svg>
      </motion.div>
    </motion.div>
  )
}

// Add a component for interactive notifications
const InteractiveNotification = ({
  visible,
  type,
  message,
  onDismiss,
}: {
  visible: boolean
  type: "success" | "error"
  message: string
  onDismiss: () => void
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0)

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{
        y: visible ? 0 : -100,
        opacity: visible ? 1 : 0,
        x: swipeOffset,
      }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDrag={(_, info) => {
        setSwipeOffset(info.offset.x)
      }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) {
          onDismiss()
        }
        setSwipeOffset(0)
      }}
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm w-full
        ${type === "success" ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" : "bg-gradient-to-r from-red-500 to-pink-500 text-white"}`}
    >
      <div className={`rounded-full p-1 ${type === "success" ? "bg-green-400" : "bg-red-400"}`}>
        {type === "success" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
        <p className="text-xs opacity-80">Swipe to dismiss</p>
      </div>
      <button onClick={onDismiss} className="text-white opacity-80 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showContactIT, setShowContactIT] = useState(false)
  const [contactMessage, setContactMessage] = useState("")
  const [error, setError] = useState("")
  // Add a new state for the dashboard transition
  const [isDashboardTransition, setIsDashboardTransition] = useState(false)
  const [isCapsLockOn, setIsCapsLockOn] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const [mascotEmotion, setMascotEmotion] = useState<string>("happy")
  const [mascotMessage, setMascotMessage] = useState<string>("Hai! Silahkan login ya!")
  const [showMascot, setShowMascot] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Add new state variables to the LoginForm component
  // Add these after the existing state declarations:
  const [showLogoFormation, setShowLogoFormation] = useState(false)
  const [showParticleExplosion, setShowParticleExplosion] = useState(false)
  const [notification, setNotification] = useState<{ visible: boolean; type: "success" | "error"; message: string }>({
    visible: false,
    type: "success",
    message: "",
  })

  // Add these new state variables after the existing state declarations
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null)
  const [isIdle, setIsIdle] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>("")
  const [currentIllustration, setCurrentIllustration] = useState(0)

  // Add these arrays of loading messages and motivational quotes
  const loadingMessages = [
    "Bentar ya... Sistem lagi siap-siap",
    "Menyiapkan data kamu...",
    "Hampir selesai...",
    "Mengecek kredensial...",
    "Memuat dashboard kamu...",
    "Sebentar lagi masuk...",
  ]

  const motivationalQuotes = [
    "Semangat pagi! Hari ini pasti sukses!",
    "Kerja keras hari ini, hasil manis besok!",
    "Kamu hebat! Teruslah bersinar!",
    "Kesuksesan dimulai dengan langkah kecil",
    "Hari baru, semangat baru!",
  ]

  // Add this function to reset the idle timer
  const resetIdleTimer = () => {
    // Clear any existing timer
    if (idleTimer) {
      clearTimeout(idleTimer)
    }

    // Reset idle state if it was active
    if (isIdle) {
      setIsIdle(false)
    }

    // Set a new timer
    const timer = setTimeout(() => {
      setIsIdle(true)
      setMascotEmotion("thinking")
      setMascotMessage("Masih di sana? Butuh bantuan?")
      setShowMascot(true)
    }, 30000) // 30 seconds

    setIdleTimer(timer)
  }

  // Add this function to get a random loading message
  const getRandomLoadingMessage = () => {
    const allMessages = [...loadingMessages, ...motivationalQuotes]
    const randomIndex = Math.floor(Math.random() * allMessages.length)
    return allMessages[randomIndex]
  }

  // Rotate through illustrations
  useEffect(() => {
    const illustrationInterval = setInterval(() => {
      setCurrentIllustration((prev) => (prev + 1) % 3)
    }, 5000)

    return () => clearInterval(illustrationInterval)
  }, [])

  useEffect(() => {
    // Mark as client-side rendered
    setIsClient(true)

    // Add subtle entrance animation for the entire form
    const timer = setTimeout(() => {
      document.querySelector(".login-container")?.classList.add("fully-loaded")
      setShowIntro(false)

      // Show mascot after intro animation
      setTimeout(() => {
        setShowMascot(true)
      }, 100)
    }, 1000) // Longer time to allow for intro animation

    // Add event listener for CapsLock detection
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState("CapsLock")) {
        setIsCapsLockOn(true)
      } else {
        setIsCapsLockOn(false)
      }
      resetIdleTimer() // Reset idle timer on key press
    }

    // Add event listeners for user activity
    const handleActivity = () => {
      resetIdleTimer()
    }

    // Set initial idle timer
    resetIdleTimer()

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("mousemove", handleActivity)
    window.addEventListener("mousedown", handleActivity)
    window.addEventListener("touchstart", handleActivity)
    window.addEventListener("scroll", handleActivity)

    return () => {
      clearTimeout(timer)
      if (idleTimer) clearTimeout(idleTimer)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("mousemove", handleActivity)
      window.removeEventListener("mousedown", handleActivity)
      window.removeEventListener("touchstart", handleActivity)
      window.removeEventListener("scroll", handleActivity)
    }
  }, [])

  // Modify the handleSubmit function to include random loading messages
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset error state
    setError("")

    // Validate inputs
    if (!email || !password) {
      setError("Email and password are required")
      // Add shake animation to the form
      const form = document.querySelector("form")
      form?.classList.add("shake-animation")
      setTimeout(() => {
        form?.classList.remove("shake-animation")
      }, 500)

      // Update mascot for validation error
      setMascotEmotion("thinking")
      setMascotMessage("Hmm, email dan password harus diisi ya!")
      return
    }

    setIsLoading(true)
    // Set a random loading message
    setLoadingMessage(getRandomLoadingMessage())

    // Change loading message every 3 seconds while loading
    const messageInterval = setInterval(() => {
      setLoadingMessage(getRandomLoadingMessage())
    }, 3000)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Set the error from backend
        setError(result.error)
        // Replace with:
        setNotification({
          visible: true,
          type: "error",
          message: result.error || "Invalid email or password",
        })

        // Add shake animation to the form
        const form = document.querySelector("form")
        form?.classList.add("shake-animation")
        setTimeout(() => {
          form?.classList.remove("shake-animation")
        }, 500)

        // Update mascot for login failure
        setMascotEmotion("confused")
        setMascotMessage("Wah, password-nya salah. Coba lagi, ya.")
      } else {
        // Replace this block:
        // With this enhanced version:
        // Show interactive notification instead of toast
        setNotification({
          visible: true,
          type: "success",
          message: "Login successful! Welcome back!",
        })

        // Update mascot for login success
        setMascotEmotion("excited")
        setMascotMessage("Mantap, kamu masuk. Let's go!")

        // Trigger particle explosion effect
        setShowParticleExplosion(true)

        // Show dashboard transition before redirecting
        setTimeout(() => {
          setIsDashboardTransition(true)

          // Delay the redirect to show the transition
          setTimeout(() => {
            router.push("/dashboard")
            router.refresh()
          }, 1500)
        }, 1000) // Delay dashboard transition to allow particle explosion to be visible
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : "An error occurred during login"
      setError(errorMessage)
      // Replace with:
      setNotification({
        visible: true,
        type: "error",
        message: errorMessage,
      })

      // Add shake animation to the form
      const form = document.querySelector("form")
      form?.classList.add("shake-animation")
      setTimeout(() => {
        form?.classList.remove("shake-animation")
      }, 500)

      // Update mascot for error
      setMascotEmotion("sad")
      setMascotMessage("Aduh, ada error nih. Coba refresh halaman ya.")
    } finally {
      clearInterval(messageInterval)
      if (!isDashboardTransition) {
        setIsLoading(false)
      }
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    setContactMessage("For password reset, please contact IT department")
    setShowContactIT(true)

    // Update mascot for forgot password
    setMascotEmotion("sad")
    setMascotMessage("Gapapa, kita semua pernah lupa. Klik aja tombol reset.")
  }

  const handleContactSupport = (e: React.MouseEvent) => {
    e.preventDefault()
    setContactMessage("For support, please contact IT department")
    setShowContactIT(true)
  }

  const closeContactMessage = () => {
    setShowContactIT(false)
  }

  // Add a keyDown handler for the password field
  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleEmailFocus = () => {
    setMascotEmotion("thinking")
    setMascotMessage("Pastikan email kamu aktif, ya.")
  }

  const handlePasswordFocus = () => {
    setMascotEmotion("wink")
    setMascotMessage("Ingat ya, password bersifat rahasia!")
  }

  // Replace the return statement with this updated version that includes all the new features
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-white  via-teal-50 to-teal-100 dark:from-[#0f172a] dark:via-[#0f766e] dark:to-[#0e7490] overflow-hidden login-container transition-opacity duration-500 opacity-95">
      {/* Cinematic Intro Animation */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-50 bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="text-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center mb-4"
              >
                <Image
                  src="/images/Logo PT.png"
                  alt="PT HANG TONG MANUFACTORY"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-2xl font-bold text-white"
              >
                PT HANG TONG MANUFACTORY
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="text-gray-400 mt-2"
              >
                HR Management System
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Transition Animation */}
      <AnimatePresence>
        {isDashboardTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-teal-600 to-cyan-600 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center text-white"
            >
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
                <div className="relative z-10 w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Image
                    src="/images/Logo PT.png"
                    alt="PT HANG TONG MANUFACTORY"
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Welcome Back!</h2>
              <p className="text-white/80 mb-6">Preparing your dashboard...</p>

              {/* Loading skeleton shimmer */}
              <div className="w-64 mx-auto space-y-3">
                <div className="h-4 bg-white/20 rounded-md overflow-hidden">
                  <div className="h-full w-2/3 bg-white/30 rounded-md animate-shimmer-dashboard"></div>
                </div>
                <div className="h-4 bg-white/20 rounded-md overflow-hidden">
                  <div className="h-full w-4/5 bg-white/30 rounded-md animate-shimmer-dashboard animation-delay-200"></div>
                </div>
                <div className="h-4 bg-white/20 rounded-md overflow-hidden">
                  <div className="h-full w-1/2 bg-white/30 rounded-md animate-shimmer-dashboard animation-delay-400"></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated background with floating bubbles */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-200/80 via-teal-100/80 to-cyan-200/80 dark:from-slate-900/80 dark:via-slate-800/80 dark:to-slate-900/80 animate-gradient-shift"></div>

        {/* Animated grid overlay with reduced opacity for better performance */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmlkLWdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuMDUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMDAwMDAiIHN0b3Atb3BhY2l0eT0iMC4wNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjZ3JpZC1ncmFkaWVudCkiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+')] opacity-20"></div>
      </div>

      {/* Main content - Responsive layout for all devices */}
      <div className="flex flex-col lg:flex-row w-full h-full">
        {/* Left side - HR Illustrations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full lg:w-1/2 flex items-center justify-center relative order-2 lg:order-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100/80 to-cyan-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-b lg:border-b-0 lg:border-r border-teal-200 dark:border-slate-700"></div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-4 sm:space-y-6 max-w-md px-4 sm:px-6 py-6 sm:py-10">
            {/* HR Illustrations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="w-full h-64 sm:h-80 md:h-96 relative"
            >
              <HRIllustration currentScene={currentIllustration} />
            </motion.div>

            {/* Illustration caption */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-center"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-teal-700 dark:text-teal-300">
                {currentIllustration === 0
                  ? "Streamline Your HR Processes"
                  : currentIllustration === 1
                    ? "Efficient Leave Management"
                    : "Collaborative Team Environment"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-sm">
                {currentIllustration === 0
                  ? "Simplify employee onboarding and documentation with our digital forms"
                  : currentIllustration === 1
                    ? "Quick approval workflows for time-off requests and leave management"
                    : "Foster team collaboration and communication with our integrated tools"}
              </p>
            </motion.div>

            {/* Company name */}
            <div className="mt-auto pt-4">
              <h3 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                PT HANG TONG MANUFACTORY
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">HR Management System</p>
            </div>
          </div>
        </motion.div>

        {/* Vertical divider - only visible on large screens */}
        <div className="hidden lg:block w-px h-full bg-gradient-to-b from-transparent via-teal-300 dark:via-teal-700 to-transparent absolute left-1/2 transform -translate-x-1/2"></div>

        {/* Right side - Login Form with glass effect */}
        <div className="w-full lg:w-1/2 flex items-center justify-center relative order-1 lg:order-2">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100/90 to-cyan-100/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm"></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="w-full max-w-xs sm:max-w-sm md:max-w-md relative z-10 px-4 sm:px-6 py-6 sm:py-10"
          >
            <AnimatePresence>
              {showContactIT && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert className="mb-4 bg-white/70 dark:bg-slate-800/70 border border-teal-200 dark:border-teal-800 shadow-sm backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                      <AlertDescription className="text-gray-700 dark:text-gray-300">{contactMessage}</AlertDescription>
                      <Button variant="ghost" size="icon" onClick={closeContactMessage} className="h-6 w-6">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </div>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
                Welcome Back
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500 dark:text-teal-400 animate-pulse" />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Sign in to your account</p>
            </div>

            {/* Glass effect login form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4 sm:space-y-6 bg-teal-50/60 dark:bg-slate-800/60 backdrop-blur-md p-4 sm:p-6 rounded-xl border border-teal-200/70 dark:border-slate-700/50 shadow-lg"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="space-y-1 sm:space-y-2"
              >
                <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors duration-200" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={handleEmailFocus}
                    ref={emailInputRef}
                    required
                    className="pl-8 sm:pl-10 text-sm sm:text-base h-9 sm:h-10 bg-white/70 dark:bg-slate-800/70 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-300 dark:focus:ring-teal-800 transition-all group-hover:border-teal-400 dark:group-hover:border-teal-500"
                  />
                  <div className="absolute inset-0 border border-teal-300/0 group-hover:border-teal-300/50 dark:group-hover:border-teal-500/50 rounded-md pointer-events-none transition-all duration-300"></div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="space-y-1 sm:space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <Button
                    variant="link"
                    className="text-xs text-teal-500 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 p-0 h-auto"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors duration-200" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                    onFocus={handlePasswordFocus}
                    ref={passwordInputRef}
                    required
                    className="pl-8 sm:pl-10 pr-8 sm:pr-10 text-sm sm:text-base h-9 sm:h-10 bg-white/70 dark:bg-slate-800/70 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-300 dark:focus:ring-teal-800 transition-all group-hover:border-teal-400 dark:group-hover:border-teal-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-teal-500 dark:hover:text-teal-400"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                  <div className="absolute inset-0 border border-teal-300/0 group-hover:border-teal-300/50 dark:group-hover:border-teal-500/50 rounded-md pointer-events-none transition-all duration-300"></div>
                </div>

                {/* CapsLock indicator */}
                <AnimatePresence>
                  {isCapsLockOn && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      CapsLock is on
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-md text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="pt-2"
              >
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 dark:from-teal-500 dark:to-cyan-500 dark:hover:from-teal-600 dark:hover:to-cyan-600 text-white transition-all duration-300 shadow-lg shadow-teal-300/30 dark:shadow-teal-900/30 hover:shadow-teal-400/40 dark:hover:shadow-teal-800/40 relative overflow-hidden group h-10 sm:h-12 text-sm sm:text-base"
                  disabled={isLoading || isDashboardTransition}
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                  {isLoading || isDashboardTransition ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="animate-pulse-text">
                        {isDashboardTransition ? "Preparing dashboard..." : loadingMessage || "Logging in..."}
                      </span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="text-center text-xs text-gray-500 dark:text-gray-400"
              >
                <Button
                  variant="link"
                  className="text-xs text-teal-500 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                  onClick={handleContactSupport}
                >
                  Need help? Contact support
                </Button>
              </motion.div>
            </form>

            {/* Status indicators with animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-4 sm:mt-6 md:mt-8 flex justify-center space-x-4"
            >
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 mr-1 sm:mr-2 animate-pulse"></div>
                System Online
              </div>
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 mr-1 sm:mr-2 animate-pulse"></div>
                Secure Connection
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Success Animation */}
      <SuccessAnimation visible={showParticleExplosion} />

      {/* Interactive Notification */}
      <InteractiveNotification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onDismiss={() => setNotification((prev) => ({ ...prev, visible: false }))}
      />

      {/* Mascot character */}
      <AnimatePresence>
        {showMascot && !isDashboardTransition && !showIntro && (
          <Mascot
            emotion={mascotEmotion}
            message={mascotMessage}
            className="bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8"
          />
        )}
      </AnimatePresence>

      {/* CSS for animations */}
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          height: 100%;
          width: 100%;
        }
        
        .login-container {
          opacity: 0;
          transition: opacity 0.5s ease-out;
        }
        
        .login-container.fully-loaded {
          opacity: 1;
        }
        
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        
        @keyframes shimmer-dashboard {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes float {
          0% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(10px); }
          50% { transform: translateY(0px) translateX(20px); }
          75% { transform: translateY(10px) translateX(10px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes shake-animation {
          0% { transform: translateX(0); }
          10% { transform: translateX(-5px); }
          20% { transform: translateX(5px); }
          30% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          50% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          70% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
          90% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
        
        .shake-animation {
          animation: shake-animation 0.5s ease-in-out;
        }
        
        .animate-gradient-shift {
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-text {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        .animate-pulse-text {
          animation: pulse-text 1.5s ease-in-out infinite;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes digital-particle {
          0% { 
            transform: translateY(0) translateX(0); 
            opacity: 0; 
          }
          10% { 
            opacity: 1; 
          }
          90% { 
            opacity: 1; 
          }
          100% { 
            transform: translateY(-100px) translateX(100px); 
            opacity: 0; 
          }
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 25s linear infinite;
        }
      `}</style>
    </div>
  )
}