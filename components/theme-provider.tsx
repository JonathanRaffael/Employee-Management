"use client"

import React, { useEffect, useState, createContext, useContext, ReactNode } from "react"

// 1. Buat tipe Theme
type Theme = "light" | "dark"

// 2. Buat context value dan context-nya
interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// 3. Buat tipe props provider
interface ThemeProviderProps {
  children: ReactNode
}

// 4. Buat ThemeProvider
const storageKey = "theme"
const defaultTheme: Theme = "light"

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme
    if (storedTheme) {
      setTheme(storedTheme)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 5. Hook untuk pakai context
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
