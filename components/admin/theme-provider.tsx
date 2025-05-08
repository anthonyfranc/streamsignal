"use client"

import type React from "react"

import { createContext } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps as NextThemeProviderProps } from "next-themes"
import { useTheme as useNextTheme } from "next-themes"

type ThemeProviderProps = NextThemeProviderProps & {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
}

type ThemeProviderState = {
  theme: string
  setTheme: (theme: string) => void
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "light",
  setTheme: () => null,
})

export function AdminThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "admin-ui-theme",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme={defaultTheme} enableSystem={false} {...props}>
      {children}
    </NextThemesProvider>
  )
}

export const useTheme = () => {
  const { theme, setTheme } = useNextTheme()

  return {
    theme: theme || "light",
    setTheme,
  }
}
