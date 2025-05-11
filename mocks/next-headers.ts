// This is a mock implementation of next/headers that can be used in Pages Router
// It provides the same API but uses alternative implementations

// Mock cookies function
export function cookies() {
  return {
    get: (name: string) => {
      // In Pages Router, we can't access cookies directly
      // This will be used at build time only, so return null
      return null
    },
    getAll: () => {
      return []
    },
    set: () => {
      // No-op in Pages Router
    },
    delete: () => {
      // No-op in Pages Router
    },
  }
}

// Mock headers function
export function headers() {
  return new Map()
}

// Other exports from next/headers if needed
