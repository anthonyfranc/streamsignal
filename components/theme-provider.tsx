"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  theme: string
  setTheme: (theme: string) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, attribute = "class", defaultTheme = "light", ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<string>(defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement

    // Remove any existing theme classes
    root.classList.remove("dark")

    // Always use light theme
    root.classList.add("light")

    // Set the data attribute if needed
    if (attribute !== "class") {
      root.setAttribute(attribute, "light")
    }
  }, [attribute])

  const value = {
    theme: "light",
    setTheme: (theme: string) => {
      // No-op since we're enforcing light theme
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
