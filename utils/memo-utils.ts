/**
 * Deep compares two objects for equality
 * Useful for React.memo comparison functions
 */
export function deepEqual(objA: any, objB: any): boolean {
  // Simple equality check
  if (objA === objB) return true

  // If either is null or not an object, they're not equal
  if (!objA || !objB || typeof objA !== "object" || typeof objB !== "object") return false

  // Get keys of both objects
  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  // If different number of keys, they're not equal
  if (keysA.length !== keysB.length) return false

  // Check if all keys in A exist in B and have the same value
  return keysA.every((key) => {
    // Check if key exists in B
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false

    // Get values
    const valA = objA[key]
    const valB = objB[key]

    // If both values are objects, recursively compare
    if (typeof valA === "object" && valA !== null && typeof valB === "object" && valB !== null) {
      return deepEqual(valA, valB)
    }

    // Otherwise, directly compare values
    return valA === valB
  })
}

/**
 * Shallow compares two arrays by length and reference equality of items
 * More performant than deep equality for simple arrays
 */
export function shallowArrayEqual<T>(arrayA: T[] | undefined, arrayB: T[] | undefined): boolean {
  if (arrayA === arrayB) return true
  if (!arrayA || !arrayB) return false
  if (arrayA.length !== arrayB.length) return false

  return arrayA.every((item, index) => item === arrayB[index])
}

/**
 * Compares two objects by specified keys only
 * Useful for React.memo when you only care about certain prop changes
 */
export function compareProps<T extends object>(objA: T, objB: T, keys: (keyof T)[]): boolean {
  return keys.every((key) => objA[key] === objB[key])
}

/**
 * Creates a memoization key from multiple values
 * Useful for useMemo dependencies
 */
export function createMemoKey(...args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        return JSON.stringify(arg)
      }
      return String(arg)
    })
    .join("|")
}
