"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { Eye, EyeOff, Lock, Mail, Users, Calendar, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "./theme-toggle"

// ====== Enhanced HR Illustration ======

const HR_FEATURES = [
  { title: "Employee Management", color: "from-teal-500 to-cyan-500" as const },
  { title: "Leave Management", color: "from-blue-500 to-indigo-500" as const },
  { title: "Performance Tracking", color: "from-purple-500 to-pink-500" as const },
]

const renderFeatureIcon = (index: number) => {
  const iconClass = "h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white"
  switch (index) {
    case 0:
      return <Users className={iconClass} />
    case 1:
      return <Calendar className={iconClass} />
    case 2:
      return <TrendingUp className={iconClass} />
    default:
      return <Users className={iconClass} />
  }
}

const EnhancedHRIllustration = () => {
  const [currentFeature, setCurrentFeature] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % HR_FEATURES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-64 sm:h-72 lg:h-80 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 to-cyan-50/80 dark:from-slate-800/80 dark:to-slate-700/80 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmlkLWdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuMDUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMDAwMDAiIHN0b3Atb3BhY2l0eT0iMC4wNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjZ3JpZC1ncmFkaWVudCkiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+')] opacity-30"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFeature}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 sm:space-y-6"
          >
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto bg-gradient-to-r ${HR_FEATURES[currentFeature].color} rounded-full flex items-center justify-center shadow-lg`}
            >
              {renderFeatureIcon(currentFeature)}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white">
                {HR_FEATURES[currentFeature].title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
                {currentFeature === 0 &&
                  "Manage employee data, onboarding, and organizational structure efficiently"}
                {currentFeature === 1 &&
                  "Streamline leave requests, approvals, and attendance tracking"}
                {currentFeature === 2 &&
                  "Monitor performance metrics and employee development progress"}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicators */}
        <div className="flex space-x-2 mt-4 sm:mt-6">
          {HR_FEATURES.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                index === currentFeature
                  ? "bg-teal-500 dark:bg-teal-400 scale-125"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ====== Main Login Component ======

export default function ProfessionalLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    router.prefetch("/dashboard")
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Email and password are required")
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        toast({
          title: "Login failed",
          description: "Please check your email and password.",
          variant: "destructive",
        })
        return
      }

      router.push("/dashboard")
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred during login"

      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:to-black opacity-80" />
      <div className="absolute inset-0 bg-white/20 dark:bg-slate-800/20 backdrop-blur-sm" />

      <div className="flex flex-col lg:flex-row min-h-screen relative z-10">
        {/* Left side - Branding */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[50vh] lg:min-h-screen">
          <div className="max-w-lg w-full space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mx-auto mb-4 sm:mb-6 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-gray-200 dark:border-slate-700 p-3">
                <Image
                  src="/images/logo-cropped.png"
                  alt="HT MANUFACTORY Logo"
                  width={80}
                  height={80}
                  className="object-contain w-full h-full"
                />
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-300 mb-2 sm:mb-3">
                Hang Tong Manufactory
              </h1>

              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
                HR Management System
              </p>
            </div>

            <EnhancedHRIllustration />

            {/* Features */}
            <div className="hidden sm:block space-y-3 lg:space-y-4">
              {[
                { text: "Employee Management", icon: Users },
                { text: "Leave Management", icon: Calendar },
                { text: "Performance Tracking", icon: TrendingUp },
              ].map((item, index) => (
                <div key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center mr-4">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm lg:text-base">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[50vh] lg:min-h-screen">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-slate-800/90 p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 backdrop-blur-sm relative">
              {/* Theme toggle in card context */}
              <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
              </div>

              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-300">
                  Welcome Back
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                  Sign in to your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-12 h-12 sm:h-14 border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-600 dark:focus:border-teal-400 dark:focus:ring-teal-400/20 transition-all duration-200 hover:border-teal-400 dark:hover:border-teal-500"
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Password
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 p-0 h-auto"
                      onClick={(e) => {
                        e.preventDefault()
                        // Intentional: diarahkan ke IT support
                        // Bisa diubah nanti ke halaman forgot password beneran
                        // Sekarang biar nggak bohong, kita munculin message lewat toast
                        toast({
                          title: "Forgot password",
                          description: "Silahkan menghubungi IT untuk bantuan reset password.",
                        })
                      }}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-12 pr-14 h-12 sm:h-14 border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-600 dark:focus:border-teal-400 dark:focus:ring-teal-400/20 transition-all duration-200 hover:border-teal-400 dark:hover:border-teal-500"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-200 rounded-full"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <motion.div
                        initial={false}
                        animate={{ rotate: showPassword ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </motion.div>
                    </Button>
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm"
                      role="alert"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isLoading || !email || !password}
                >
                  <motion.div
                    className="flex items-center justify-center space-x-2"
                    initial={false}
                    animate={isLoading ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{
                      duration: 0.5,
                      repeat: isLoading ? Number.POSITIVE_INFINITY : 0,
                    }}
                  >
                    {isLoading && (
                      <motion.div
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                      />
                    )}
                    <span>{isLoading ? "Signing in..." : "Sign In"}</span>
                  </motion.div>
                </Button>
              </form>

              {/* Status */}
              <div className="mt-6 sm:mt-8 flex justify-center space-x-6 sm:space-x-8">
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  System Online
                </div>
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mr-2" />
                  Secure Connection
                </div>
              </div>

              <div className="text-xs text-center text-gray-400 mt-8">
                HRIS System v1.2 • Support: nathans.htm@gmail.com
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
