import type { StreamingService, Channel } from "@/types/streaming"

export type FilterOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "between"
  | "in"
  | "notIn"
  | "isTrue"
  | "isFalse"
  | "isEmpty"
  | "isNotEmpty"
  | "before"
  | "after"
  | "onDate"
  | "dateRange"

export type FilterDataType = "string" | "number" | "boolean" | "date" | "select" | "multiselect"

export interface FilterOption {
  id: string
  label: string
  type: FilterDataType
  field: string
  operators: FilterOperator[]
  options?: { label: string; value: string | number | boolean }[]
  placeholder?: string
}

export interface FilterCondition {
  id: string
  field: string
  operator: FilterOperator
  value: any
  valueEnd?: any // For "between" and "dateRange" operators
}

export interface FilterGroup {
  id: string
  logic: "and" | "or"
  conditions: FilterCondition[]
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  entity: "services" | "channels" | "mappings"
  groups: FilterGroup[]
  is_default?: boolean
  created_at: string
  updated_at: string
}

// Type guard functions to check if an item passes a filter condition
export function passesFilterCondition(item: StreamingService | Channel, condition: FilterCondition): boolean {
  const value = item[condition.field as keyof (StreamingService | Channel)]

  switch (condition.operator) {
    case "equals":
      return value === condition.value
    case "contains":
      return typeof value === "string" && value.toLowerCase().includes(String(condition.value).toLowerCase())
    case "startsWith":
      return typeof value === "string" && value.toLowerCase().startsWith(String(condition.value).toLowerCase())
    case "endsWith":
      return typeof value === "string" && value.toLowerCase().endsWith(String(condition.value).toLowerCase())
    case "greaterThan":
      return typeof value === "number" && value > Number(condition.value)
    case "lessThan":
      return typeof value === "number" && value < Number(condition.value)
    case "between":
      return typeof value === "number" && value >= Number(condition.value) && value <= Number(condition.valueEnd)
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(value)
    case "notIn":
      return Array.isArray(condition.value) && !condition.value.includes(value)
    case "isTrue":
      return Boolean(value) === true
    case "isFalse":
      return Boolean(value) === false
    case "isEmpty":
      return value === null || value === undefined || value === ""
    case "isNotEmpty":
      return value !== null && value !== undefined && value !== ""
    case "before":
      return new Date(value as string) < new Date(condition.value)
    case "after":
      return new Date(value as string) > new Date(condition.value)
    case "onDate":
      const itemDate = new Date(value as string)
      const conditionDate = new Date(condition.value)
      return (
        itemDate.getFullYear() === conditionDate.getFullYear() &&
        itemDate.getMonth() === conditionDate.getMonth() &&
        itemDate.getDate() === conditionDate.getDate()
      )
    case "dateRange":
      const date = new Date(value as string)
      const startDate = new Date(condition.value)
      const endDate = new Date(condition.valueEnd)
      return date >= startDate && date <= endDate
    default:
      return false
  }
}

export function passesFilterGroup(item: StreamingService | Channel, group: FilterGroup): boolean {
  if (group.conditions.length === 0) return true

  if (group.logic === "and") {
    return group.conditions.every((condition) => passesFilterCondition(item, condition))
  } else {
    return group.conditions.some((condition) => passesFilterCondition(item, condition))
  }
}

export function passesAllFilters(item: StreamingService | Channel, groups: FilterGroup[]): boolean {
  if (groups.length === 0) return true
  return groups.every((group) => passesFilterGroup(item, group))
}
