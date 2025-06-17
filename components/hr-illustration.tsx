"use client"

import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useEffect, useState } from "react"

interface HRIllustrationProps {
  currentScene: number
}

export default function HRIllustration({ currentScene }: HRIllustrationProps) {
  // Define animation variants
  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        // When all animations are complete, start the floating animation
        delayChildren: 0.6,
      },
    },
    floating: {
      y: [0, -5, 0],
      transition: {
        duration: 6,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -20,
      transition: {
        duration: 0.6,
      },
    },
  }

  return (
    <div className="w-full h-full relative">
      <AnimatePresence mode="wait">
        {currentScene === 0 && (
          <motion.div
            key="form-filling"
            variants={containerVariants}
            initial="hidden"
            animate={["visible", "floating"]}
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
          >
            <FormFillingIllustration />
          </motion.div>
        )}

        {currentScene === 1 && (
          <motion.div
            key="leave-approval"
            variants={containerVariants}
            initial="hidden"
            animate={["visible", "floating"]}
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
          >
            <LeaveApprovalIllustration />
          </motion.div>
        )}

        {currentScene === 2 && (
          <motion.div
            key="team-discussion"
            variants={containerVariants}
            initial="hidden"
            animate={["visible", "floating"]}
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
          >
            <TeamDiscussionIllustration />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// Form Filling Illustration
function FormFillingIllustration() {
  // Add a typing animation state
  const [typingIndex, setTypingIndex] = useState(0)
  const typingText = "HR Management System"

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingIndex((prev) => (prev < typingText.length ? prev + 1 : 0))
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-w-full max-h-full"
    >
      {/* Background with gradient */}
      <rect x="50" y="40" width="300" height="220" rx="10" fill="url(#formGradient)" />
      <defs>
        <linearGradient id="formGradient" x1="50" y1="40" x2="350" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E6F7F5" />
          <stop offset="1" stopColor="#CCEFEB" />
        </linearGradient>
      </defs>
      {/* Window */}
      <rect x="280" y="50" width="60" height="70" rx="3" fill="#D1FAF5" stroke="#0F766E" strokeWidth="1" />
      <line x1="280" y1="70" x2="340" y2="70" stroke="#0F766E" strokeWidth="1" />
      <line x1="310" y1="50" x2="310" y2="120" stroke="#0F766E" strokeWidth="1" />
      {/* Plants */}
      <rect x="290" y="130" width="20" height="15" rx="2" fill="#0F766E" />
      <motion.path
        initial={{ d: "M295 130 Q295 120 300 115 Q305 120 305 130" }}
        fill="#14B8A6"
        animate={{
          d: ["M295 130 Q295 120 300 115 Q305 120 305 130", "M295 130 Q295 118 300 113 Q305 118 305 130"],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />
      <motion.path
        initial={{ d: "M290 125 Q285 120 290 115 Q295 120 290 125" }}
        fill="#14B8A6"
        animate={{
          d: ["M290 125 Q285 120 290 115 Q295 120 290 125", "M290 125 Q283 118 290 113 Q297 118 290 125"],
        }}
        transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />
      <motion.path
        initial={{ d: "M310 125 Q315 120 310 115 Q305 120 310 125" }}
        fill="#14B8A6"
        animate={{
          d: ["M310 125 Q315 120 310 115 Q305 120 310 125", "M310 125 Q317 118 310 113 Q303 118 310 125"],
        }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />
      {/* Desk with shadow */}
      <rect x="70" y="200" width="260" height="20" rx="2" fill="#94D1CC" />
      <rect x="80" y="220" width="240" height="10" rx="1" fill="#7CBFBA" />
      <rect x="90" y="230" width="220" height="5" rx="1" fill="#5AA9A4" opacity="0.5" />
      {/* Computer with reflection */}
      <rect x="120" y="120" width="160" height="100" rx="4" fill="#FFFFFF" stroke="#0F766E" strokeWidth="2" />
      <rect x="130" y="130" width="140" height="80" rx="2" fill="#F0FDFA" />
      <rect x="130" y="130" width="140" height="20" rx="2" fill="#F0FDFA" opacity="0.7" />
      {/* Form on screen with dynamic typing */}
      <rect x="140" y="140" width="120" height="10" rx="2" fill="#0F766E" />
      <rect x="140" y="155" width="120" height="5" rx="1" fill="#94D1CC" />
      <text x="140" y="170" fontSize="6" fill="#0F766E" fontFamily="sans-serif">
        {typingText.substring(0, typingIndex)}
      </text>
      <motion.rect
        x={140 + typingIndex * 3.5}
        y="165"
        width="2"
        height="8"
        fill="#0F766E"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
      />
      <rect x="140" y="175" width="80" height="5" rx="1" fill="#94D1CC" />
      <rect x="140" y="185" width="60" height="15" rx="3" fill="#0F766E" />
      <text x="150" y="195" fontSize="8" fill="white" fontFamily="sans-serif">
        Submit
      </text>
      {/* Computer stand with shadow */}
      <rect x="180" y="220" width="40" height="10" rx="2" fill="#0F766E" />
      <rect x="190" y="200" width="20" height="20" rx="2" fill="#0F766E" />
      <rect x="190" y="200" width="20" height="5" rx="1" fill="#14B8A6" opacity="0.3" />
      {/* Person with better proportions and details */}
      <circle cx="200" cy="90" r="20" fill="#14B8A6" /> {/* Head */}
      <ellipse cx="200" cy="85" rx="20" ry="18" fill="#14B8A6" /> {/* Head shape */}
      <rect x="190" y="110" width="20" height="30" rx="5" fill="#14B8A6" /> {/* Body */}
      {/* Hair */}
      <path d="M180 80 Q200 65 220 80" fill="#0F766E" />
      {/* Animated arms */}
      <motion.path
        initial={{ d: "M190 115 L170 140 L175 145 L195 120" }}
        fill="#14B8A6"
        animate={{
          d: ["M190 115 L170 140 L175 145 L195 120", "M190 115 L170 135 L175 140 L195 120"],
        }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />
      <motion.path
        initial={{ d: "M210 115 L230 140 L225 145 L205 120" }}
        fill="#14B8A6"
        animate={{
          d: ["M210 115 L230 140 L225 145 L205 120", "M210 115 L230 135 L225 140 L205 120"],
        }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse", delay: 0.5 }}
      />
      {/* Face with more details */}
      <circle cx="195" cy="85" r="2" fill="#0F766E" /> {/* Eye */}
      <circle cx="205" cy="85" r="2" fill="#0F766E" /> {/* Eye */}
      <motion.path
        initial={{ d: "M195 95 Q200 100 205 95" }}
        stroke="#0F766E"
        strokeWidth="1.5"
        fill="none"
        animate={{
          d: ["M195 95 Q200 100 205 95", "M195 96 Q200 101 205 96"],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />{" "}
      {/* Smile */}
      {/* Coffee cup with steam */}
      <rect x="260" y="180" width="20" height="20" rx="2" fill="#0F766E" />
      <rect x="258" y="178" width="24" height="4" rx="2" fill="#0F766E" />
      <motion.path
        initial={{ d: "M265 175 Q270 170 275 175" }}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        fill="none"
        animate={{
          y: [0, -5, -10, -15, -20],
          opacity: [1, 0.8, 0.6, 0.4, 0],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      />
      <motion.path
        initial={{ d: "M270 173 Q275 168 280 173" }}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        fill="none"
        animate={{
          y: [0, -5, -10, -15, -20],
          opacity: [1, 0.8, 0.6, 0.4, 0],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.7 }}
      />
      {/* Clock */}
      <circle cx="80" cy="70" r="15" fill="white" stroke="#0F766E" strokeWidth="1" />
      <motion.line
        x1="80"
        y1="70"
        x2="80"
        y2="60"
        stroke="#0F766E"
        strokeWidth="1"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        style={{ transformOrigin: "80px 70px" }}
      />
      <motion.line
        x1="80"
        y1="70"
        x2="85"
        y2="70"
        stroke="#0F766E"
        strokeWidth="1"
        animate={{ rotate: 360 }}
        transition={{ duration: 3600, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        style={{ transformOrigin: "80px 70px" }}
      />
    </svg>
  )
}

// Leave Approval Illustration
function LeaveApprovalIllustration() {
  // Add a pulsing animation for the approval stamp
  const [isApproved, setIsApproved] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsApproved(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-w-full max-h-full"
    >
      {/* Background - Office with gradient */}
      <rect x="50" y="40" width="300" height="220" rx="10" fill="url(#approvalGradient)" />
      <defs>
        <linearGradient id="approvalGradient" x1="50" y1="40" x2="350" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E6F7F5" />
          <stop offset="1" stopColor="#D1FAF5" />
        </linearGradient>
      </defs>
      {/* Window with view */}
      <rect x="280" y="60" width="50" height="60" rx="2" fill="#D1FAF5" stroke="#0F766E" strokeWidth="1" />
      <line x1="280" y1="75" x2="330" y2="75" stroke="#0F766E" strokeWidth="1" />
      <line x1="305" y1="60" x2="305" y2="120" stroke="#0F766E" strokeWidth="1" />
      <path d="M290 100 Q300 90 310 100 Q320 90 330 100" stroke="#14B8A6" strokeWidth="1" fill="none" />
      <rect x="290" y="100" width="40" height="20" fill="#14B8A6" opacity="0.3" />
      {/* Office desk with shadow */}
      <rect x="70" y="180" width="260" height="20" rx="2" fill="#94D1CC" />
      <rect x="80" y="200" width="240" height="30" rx="1" fill="#7CBFBA" />
      <rect x="90" y="230" width="220" height="5" rx="1" fill="#5AA9A4" opacity="0.5" />
      {/* Manager with better details */}
      <circle cx="150" cy="100" r="25" fill="#0F766E" /> {/* Head */}
      <rect x="135" y="125" width="30" height="40" rx="5" fill="#0F766E" /> {/* Body */}
      <rect x="135" y="165" width="10" height="30" rx="2" fill="#0F766E" /> {/* Leg */}
      <rect x="155" y="165" width="10" height="30" rx="2" fill="#0F766E" /> {/* Leg */}
      {/* Manager hair */}
      <path d="M130 85 Q150 70 170 85" fill="#094E49" />
      {/* Manager face with blinking */}
      <motion.circle
        cx="143"
        cy="95"
        r="3"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
      />{" "}
      {/* Eye */}
      <motion.circle
        cx="157"
        cy="95"
        r="3"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
      />{" "}
      {/* Eye */}
      <path d="M143 95 Q150 105 157 95" stroke="white" strokeWidth="1.5" fill="none" /> {/* Smile */}
      {/* Manager accessories */}
      <rect x="135" y="125" width="30" height="5" rx="1" fill="#14B8A6" /> {/* Collar */}
      <rect x="145" y="125" width="10" height="15" rx="1" fill="#14B8A6" /> {/* Tie */}
      {/* Employee with better details */}
      <circle cx="250" cy="110" r="20" fill="#14B8A6" /> {/* Head */}
      <rect x="240" y="130" width="20" height="35" rx="5" fill="#14B8A6" /> {/* Body */}
      <rect x="240" y="165" width="8" height="30" rx="2" fill="#14B8A6" /> {/* Leg */}
      <rect x="252" y="165" width="8" height="30" rx="2" fill="#14B8A6" /> {/* Leg */}
      {/* Employee hair */}
      <path d="M235 100 Q250 85 265 100" fill="#0F766E" />
      {/* Employee face with blinking */}
      <motion.circle
        cx="245"
        cy="105"
        r="2"
        fill="#0F766E"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, delay: 1.5 }}
      />{" "}
      {/* Eye */}
      <motion.circle
        cx="255"
        cy="105"
        r="2"
        fill="#0F766E"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, delay: 1.5 }}
      />{" "}
      {/* Eye */}
      <path d="M245 115 Q250 118 255 115" stroke="#0F766E" strokeWidth="1.5" fill="none" /> {/* Smile */}
      {/* Leave request document with more details */}
      <rect x="170" y="90" width="60" height="80" rx="2" fill="white" stroke="#0F766E" strokeWidth="1" />
      <rect x="175" y="95" width="50" height="5" rx="1" fill="#94D1CC" />
      <rect x="175" y="105" width="50" height="5" rx="1" fill="#94D1CC" />
      <rect x="175" y="115" width="30" height="5" rx="1" fill="#94D1CC" />
      <rect x="175" y="125" width="40" height="5" rx="1" fill="#94D1CC" />
      <rect x="175" y="135" width="35" height="5" rx="1" fill="#94D1CC" />
      {/* Approval stamp/checkmark with animation */}
      <motion.g
        animate={
          isApproved
            ? {
                scale: [0, 1.5, 1],
                rotate: [0, 15, 0],
                opacity: [0, 1],
              }
            : {}
        }
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <circle cx="200" cy="150" r="15" fill="#14B8A6" fillOpacity="0.3" />
        <path
          d="M190 150 L198 158 L210 142"
          stroke="#0F766E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
      {/* Manager's hand with improved animation */}
      <motion.path
        initial={{ d: "M165 125 L185 140" }}
        stroke="#0F766E"
        strokeWidth="8"
        strokeLinecap="round"
        animate={
          isApproved
            ? {
                d: ["M165 125 L185 140", "M165 125 L200 150", "M165 125 L185 140"],
              }
            : {
                d: ["M165 125 L185 140", "M165 125 L190 145", "M165 125 L185 140"],
              }
        }
        transition={{ duration: 1.5, times: [0, 0.6, 1] }}
      />
      {/* Calendar on wall with more details */}
      <rect x="80" y="60" width="40" height="40" rx="2" fill="white" stroke="#0F766E" strokeWidth="1" />
      <rect x="85" y="65" width="30" height="5" rx="1" fill="#0F766E" />
      <text x="90" y="69" fontSize="4" fill="white" fontFamily="sans-serif">
        MAY 2025
      </text>
      <line x1="90" y1="75" x2="90" y2="95" stroke="#94D1CC" strokeWidth="1" />
      <line x1="100" y1="75" x2="100" y2="95" stroke="#94D1CC" strokeWidth="1" />
      <line x1="110" y1="75" x2="110" y2="95" stroke="#94D1CC" strokeWidth="1" />
      <line x1="85" y1="80" x2="115" y2="80" stroke="#94D1CC" strokeWidth="1" />
      <line x1="85" y1="90" x2="115" y2="90" stroke="#94D1CC" strokeWidth="1" />
      <motion.circle
        cx="100"
        cy="85"
        r="5"
        fill="#14B8A6"
        fillOpacity="0.5"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      />
      <text x="98" y="87" fontSize="5" fill="#0F766E" fontFamily="sans-serif">
        16
      </text>
      {/* Office plant */}
      <rect x="70" y="140" width="15" height="10" rx="1" fill="#0F766E" />
      <motion.path
        initial={{ d: "M75 140 Q70 130 75 125 Q80 130 75 140" }}
        fill="#14B8A6"
        animate={{
          d: ["M75 140 Q70 130 75 125 Q80 130 75 140", "M75 140 Q68 128 75 123 Q82 128 75 140"],
        }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />
      <motion.path
        initial={{ d: "M70 135 Q65 130 70 125 Q75 130 70 135" }}
        fill="#14B8A6"
        animate={{
          d: ["M70 135 Q65 130 70 125 Q75 130 70 135", "M70 135 Q63 128 70 123 Q77 128 70 135"],
        }}
        transition={{ duration: 3.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
      />
    </svg>
  )
}

// Team Discussion Illustration
function TeamDiscussionIllustration() {
  // Add a typing animation for the presentation
  const [chartHeight, setChartHeight] = useState([0, 0, 0, 0])

  useEffect(() => {
    const timer = setTimeout(() => {
      setChartHeight([10, 15, 20, 25])
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-w-full max-h-full"
    >
      {/* Background - Meeting room with gradient */}
      <rect x="50" y="40" width="300" height="220" rx="10" fill="url(#meetingGradient)" />
      <defs>
        <linearGradient id="meetingGradient" x1="50" y1="40" x2="350" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E6F7F5" />
          <stop offset="1" stopColor="#D1FAF5" />
        </linearGradient>
      </defs>
      {/* Window with view */}
      <rect x="60" y="50" width="50" height="40" rx="2" fill="#D1FAF5" stroke="#0F766E" strokeWidth="1" />
      <line x1="60" y1="65" x2="110" y2="65" stroke="#0F766E" strokeWidth="1" />
      <line x1="85" y1="50" x2="85" y2="90" stroke="#0F766E" strokeWidth="1" />
      <path d="M70 80 Q80 70 90 80 Q100 70 110 80" stroke="#14B8A6" strokeWidth="1" fill="none" />
      <rect x="70" y="80" width="40" height="10" fill="#14B8A6" opacity="0.3" />
      {/* Meeting table with reflection */}
      <ellipse cx="200" cy="180" rx="100" ry="30" fill="#94D1CC" />
      <ellipse cx="200" cy="180" rx="90" ry="25" fill="#7CBFBA" />
      <ellipse cx="200" cy="180" rx="80" ry="20" fill="#5AA9A4" opacity="0.3" />
      {/* Person 1 (left) with better details */}
      <circle cx="130" cy="120" r="20" fill="#0F766E" /> {/* Head */}
      <rect x="120" y="140" width="20" height="30" rx="5" fill="#0F766E" /> {/* Body */}
      {/* Person 1 hair */}
      <path d="M115 110 Q130 95 145 110" fill="#094E49" />
      {/* Person 1 face with blinking */}
      <motion.circle
        cx="125"
        cy="115"
        r="2"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
      />{" "}
      {/* Eye */}
      <motion.circle
        cx="135"
        cy="115"
        r="2"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
      />{" "}
      {/* Eye */}
      <path d="M125 125 Q130 128 135 125" stroke="white" strokeWidth="1.5" fill="none" /> {/* Smile */}
      {/* Person 1 accessories */}
      <rect x="120" y="140" width="20" height="5" rx="1" fill="#14B8A6" /> {/* Collar */}
      <rect x="125" y="140" width="10" height="15" rx="1" fill="#14B8A6" /> {/* Tie */}
      {/* Person 2 (center) with better details */}
      <circle cx="200" cy="110" r="20" fill="#14B8A6" /> {/* Head */}
      <rect x="190" y="130" width="20" height="30" rx="5" fill="#14B8A6" /> {/* Body */}
      {/* Person 2 hair */}
      <path d="M185 100 Q200 85 215 100" fill="#0F766E" />
      {/* Person 2 face with blinking */}
      <motion.circle
        cx="195"
        cy="105"
        r="2"
        fill="#0F766E"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, delay: 1 }}
      />{" "}
      {/* Eye */}
      <motion.circle
        cx="205"
        cy="105"
        r="2"
        fill="#0F766E"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, delay: 1 }}
      />{" "}
      {/* Eye */}
      <path d="M195 115 Q200 118 205 115" stroke="#0F766E" strokeWidth="1.5" fill="none" /> {/* Smile */}
      {/* Person 2 accessories */}
      <rect x="190" y="130" width="20" height="5" rx="1" fill="#0D9488" /> {/* Collar */}
      <circle cx="200" cy="140" r="3" fill="#0D9488" /> {/* Button */}
      {/* Person 3 (right) with better details */}
      <circle cx="270" cy="120" r="20" fill="#0F766E" /> {/* Head */}
      <rect x="260" y="140" width="20" height="30" rx="5" fill="#0F766E" /> {/* Body */}
      {/* Person 3 hair */}
      <path d="M255 110 Q270 95 285 110" fill="#094E49" />
      {/* Person 3 face with blinking */}
      <motion.circle
        cx="265"
        cy="115"
        r="2"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, delay: 2 }}
      />{" "}
      {/* Eye */}
      <motion.circle
        cx="275"
        cy="115"
        r="2"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, delay: 2 }}
      />{" "}
      {/* Eye */}
      <path d="M265 125 Q270 128 275 125" stroke="white" strokeWidth="1.5" fill="none" /> {/* Smile */}
      {/* Person 3 accessories */}
      <rect x="260" y="140" width="20" height="5" rx="1" fill="#14B8A6" /> {/* Collar */}
      <rect x="265" y="140" width="10" height="15" rx="1" fill="#14B8A6" /> {/* Tie */}
      {/* Speech bubbles with improved animations */}
      <motion.g
        animate={{
          y: [-2, 2, -2],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      >
        <path
          d="M150 90 Q150 80 160 80 L180 80 Q190 80 190 90 L190 100 Q190 110 180 110 L160 110 Q150 110 150 100 Z"
          fill="white"
          stroke="#0F766E"
          strokeWidth="1"
        />
        <rect x="160" y="90" width="20" height="3" rx="1" fill="#94D1CC" />
        <rect x="160" y="95" width="15" height="3" rx="1" fill="#94D1CC" />
        <rect x="160" y="100" width="10" height="3" rx="1" fill="#94D1CC" />
      </motion.g>
      <motion.g
        animate={{
          y: [-2, 2, -2],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.7 }}
      >
        <path
          d="M210 80 Q210 70 220 70 L240 70 Q250 70 250 80 L250 90 Q250 100 240 100 L220 100 Q210 100 210 90 Z"
          fill="white"
          stroke="#0F766E"
          strokeWidth="1"
        />
        <rect x="220" y="80" width="20" height="3" rx="1" fill="#94D1CC" />
        <rect x="220" y="85" width="15" height="3" rx="1" fill="#94D1CC" />
        <rect x="220" y="90" width="10" height="3" rx="1" fill="#94D1CC" />
      </motion.g>
      <motion.g
        animate={{
          y: [-2, 2, -2],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 1.4 }}
      >
        <path
          d="M270 90 Q270 80 280 80 L300 80 Q310 80 310 90 L310 100 Q310 110 300 110 L280 110 Q270 110 270 100 Z"
          fill="white"
          stroke="#0F766E"
          strokeWidth="1"
        />
        <rect x="280" y="90" width="20" height="3" rx="1" fill="#94D1CC" />
        <rect x="280" y="95" width="15" height="3" rx="1" fill="#94D1CC" />
        <rect x="280" y="100" width="10" height="3" rx="1" fill="#94D1CC" />
      </motion.g>
      {/* Presentation board with animated chart */}
      <rect x="320" y="60" width="60" height="50" rx="2" fill="white" stroke="#0F766E" strokeWidth="1" />
      <rect x="325" y="65" width="50" height="5" rx="1" fill="#0F766E" />
      <text x="330" y="69" fontSize="4" fill="white" fontFamily="sans-serif">
        TEAM STATS
      </text>
      <rect x="325" y="75" width="50" height="3" rx="1" fill="#94D1CC" />
      <rect x="325" y="82" width="40" height="3" rx="1" fill="#94D1CC" />
      {/* Animated chart/graph on board */}
      <line x1="330" y1="105" x2="330" y2={105 - chartHeight[0]} stroke="#14B8A6" strokeWidth="4" />
      <line x1="340" y1="105" x2="340" y2={105 - chartHeight[1]} stroke="#14B8A6" strokeWidth="4" />
      <line x1="350" y1="105" x2="350" y2={105 - chartHeight[2]} stroke="#14B8A6" strokeWidth="4" />
      <line x1="360" y1="105" x2="360" y2={105 - chartHeight[3]} stroke="#14B8A6" strokeWidth="4" />
      <line x1="325" y1="105" x2="365" y2="105" stroke="#0F766E" strokeWidth="1" />
      {/* Coffee cups on table with steam */}
      <rect x="170" y="170" width="10" height="10" rx="1" fill="#0F766E" />
      <motion.path
        initial={{ d: "M172 168 Q175 165 178 168" }}
        stroke="#FFFFFF"
        strokeWidth="0.5"
        fill="none"
        animate={{
          y: [0, -3, -6],
          opacity: [1, 0.5, 0],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      />
      <rect x="220" y="170" width="10" height="10" rx="1" fill="#0F766E" />
      <motion.path
        initial={{ d: "M222 168 Q225 165 228 168" }}
        stroke="#FFFFFF"
        strokeWidth="0.5"
        fill="none"
        animate={{
          y: [0, -3, -6],
          opacity: [1, 0.5, 0],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.7 }}
      />
      <rect x="140" y="170" width="10" height="10" rx="1" fill="#0F766E" />
      <motion.path
        initial={{ d: "M142 168 Q145 165 148 168" }}
        stroke="#FFFFFF"
        strokeWidth="0.5"
        fill="none"
        animate={{
          y: [0, -3, -6],
          opacity: [1, 0.5, 0],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 1.4 }}
      />
      {/* Document on table with animated pages */}
      <motion.rect
        x="190"
        y="165"
        width="20"
        height="25"
        rx="1"
        fill="white"
        stroke="#0F766E"
        strokeWidth="0.5"
        animate={{ rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "200px 177.5px" }}
      />
      <rect x="193" y="170" width="14" height="2" rx="0.5" fill="#94D1CC" />
      <rect x="193" y="175" width="14" height="2" rx="0.5" fill="#94D1CC" />
      <rect x="193" y="180" width="10" height="2" rx="0.5" fill="#94D1CC" />
      {/* Laptop on table */}
      <rect x="250" y="165" width="20" height="15" rx="1" fill="#0F766E" />
      <rect x="250" y="160" width="20" height="10" rx="1" fill="#14B8A6" />
      <rect x="252" y="162" width="16" height="6" rx="1" fill="#E6F7F5" />
      <rect x="257" y="162" width="6" height="6" rx="1" fill="#94D1CC" />
    </svg>
  )
}
