"use client"

import { useState, useEffect } from "react"

/**
 * A hook that provides a smooth transition between states
 * Useful for preventing UI flashing when data changes
 */
export function useTransitionState<T>(value: T, delay = 150): T {
  const [transitionValue, setTransitionValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransitionValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return transitionValue
}
