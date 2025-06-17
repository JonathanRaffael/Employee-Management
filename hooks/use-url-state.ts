"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// Custom hook for syncing state with URL parameters
export function useUrlState<T>(
  key: string,
  defaultValue: T,
  serialize: (value: T) => string = String,
  deserialize: (value: string) => T = (value) => value as unknown as T,
): [T, (value: T) => void] {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL or default value
  const [state, setState] = useState<T>(() => {
    const paramValue = searchParams.get(key)
    return paramValue ? deserialize(paramValue) : defaultValue
  })

  // Update URL when state changes
  const setValue = useCallback(
    (value: T) => {
      setState(value)

      // Create new URLSearchParams object with current params
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove the parameter
      if (value === defaultValue || value === undefined || value === null) {
        params.delete(key)
      } else {
        params.set(key, serialize(value))
      }

      // Update the URL without refreshing the page
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
      router.replace(newUrl, { scroll: false })
    },
    [key, defaultValue, serialize, router, searchParams],
  )

  // Sync state with URL on initial load and URL changes
  useEffect(() => {
    const paramValue = searchParams.get(key)
    if (paramValue !== null) {
      setState(deserialize(paramValue))
    } else if (state !== defaultValue) {
      setState(defaultValue)
    }
  }, [searchParams, key, deserialize, defaultValue, state])

  return [state, setValue]
}
