"use client"

import { motion } from "framer-motion"
import { Settings } from "lucide-react"

export default function MaintenanceClient() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-slate-100">

      {/* === Ambient gradient background === */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.25),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.25),transparent_45%)]"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* === Subtle grid texture (enterprise feel) === */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

      {/* === Floating light orbs === */}
      <motion.div
        className="absolute -top-48 -left-48 h-[32rem] w-[32rem] rounded-full bg-indigo-500/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -bottom-48 -right-48 h-[32rem] w-[32rem] rounded-full bg-emerald-500/20 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* === Content === */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center"
      >

        {/* Icon container */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur"
        >
          <Settings className="h-9 w-9 text-indigo-300" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-10 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          System Maintenance
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base"
        >
          We are performing scheduled maintenance to enhance system stability,
          security, and overall performance.
        </motion.p>

        {/* ETA Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-8 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur"
        >
          <p className="text-sm font-medium text-slate-200">
            Estimated downtime
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Approximately{" "}
            <span className="font-medium text-slate-200">30–60 minutes</span>
          </p>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-xs text-slate-400"
        >
          For urgent matters, please contact the IT administrator.
        </motion.p>
      </motion.div>
    </div>
  )
}
