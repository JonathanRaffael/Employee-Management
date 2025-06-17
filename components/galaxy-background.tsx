"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  delay: number
  duration: number
}

interface NebulaCloud {
  id: number
  x: number
  y: number
  scale: number
  opacity: number
  hue: number
  delay: number
  duration: number
}

export default function GalaxyBackground() {
  const [stars, setStars] = useState<Star[]>([])
  const [nebulaClouds, setNebulaClouds] = useState<NebulaCloud[]>([])

  useEffect(() => {
    // Generate more stars for better visibility
    const newStars = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1, // Increased size
      opacity: Math.random() * 0.8 + 0.4, // Increased opacity
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }))

    // Generate more vibrant nebula clouds
    const newNebulaClouds = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: Math.random() * 0.7 + 0.6, // Increased scale
      opacity: Math.random() * 0.25 + 0.15, // Increased opacity
      hue: Math.random() > 0.5 ? 270 : 220, // More vibrant purple and blue
      delay: Math.random() * 10,
      duration: Math.random() * 60 + 60,
    }))

    setStars(newStars)
    setNebulaClouds(newNebulaClouds)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dark background base */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-slate-900/30"></div>

      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            boxShadow: `0 0 ${star.size * 3}px ${star.size}px rgba(255, 255, 255, ${star.opacity})`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [star.opacity, star.opacity * 1.8, star.opacity],
          }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: star.duration,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Nebula clouds - more vibrant and visible */}
      {nebulaClouds.map((cloud) => (
        <motion.div
          key={cloud.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            width: `${40 * cloud.scale}vw`,
            height: `${40 * cloud.scale}vw`,
            background: `radial-gradient(circle, hsla(${cloud.hue}, 100%, 70%, ${cloud.opacity}) 0%, hsla(${cloud.hue}, 100%, 50%, 0) 70%)`,
            zIndex: -5,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: cloud.duration,
            delay: cloud.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Add some shooting stars */}
      <div className="shooting-star"></div>
      <div className="shooting-star delay-3"></div>
      <div className="shooting-star delay-5"></div>

      {/* Subtle vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/30 opacity-70"></div>
    </div>
  )
}
