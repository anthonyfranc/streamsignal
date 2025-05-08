"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { FilterGroup, FilterCondition, FilterOption } from "@/types/filters"
import type { FilterDataType, FilterOperator } from "@/types/filters"

interface ActiveFiltersProps {
  groups: FilterGroup[]
  filterOptions: FilterOption[]
  onRemoveCondition: (groupId: string, conditionId: string) => void
  onClearAll: () => void
}

export function ActiveFilters({ groups, filterOptions, onRemoveCondition, onClearAll }: ActiveFiltersProps) {
  // Count total conditions across all groups
  const totalConditions = groups.reduce((total, group) => total + group.conditions.length, 0)

  if (totalConditions === 0) {
    return null
  }

  // Get field label from field name
  const getFieldLabel = (fieldName: string): string => {
    const option = filterOptions.find((opt) => opt.field === fieldName)
    return option?.label || fieldName
  }

  // Format condition value for display
  const formatValue = (condition: FilterCondition, fieldType?: FilterDataType): string => {
    const { operator, value, valueEnd } = condition

    if (operator === "isEmpty" || operator === "isNotEmpty") {
      return ""
    }

    if (operator === "isTrue") return "True"
    if (operator === "isFalse") return "False"

    if (operator === "between" || operator === "dateRange") {
      return `${value} to ${valueEnd}`
    }

    if (fieldType === "date" && value) {
      try {
        return new Date(value as string).toLocaleDateString()
      } catch (e) {
        return String(value)
      }
    }

    return String(value)
  }

  // Get operator label
  const getOperatorLabel = (operator: FilterOperator): string => {
    const labels: Record<FilterOperator, string> = {
      equals: "=",
      contains: "contains",
      startsWith: "starts with",
      endsWith: "ends with",
      greaterThan: ">",
      lessThan: "<",
      between: "between",
      in: "in",
      notIn: "not in",
      isTrue: "is true",
      isFalse: "is false",
      isEmpty: "is empty",
      isNotEmpty: "is not empty",
      before: "before",
      after: "after",
      onDate: "on",
      dateRange: "between",
    }
    return labels[operator] || operator
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Active filters:</span>
        {groups.map((group) =>
          group.conditions.map((condition) => {
            const fieldOption = filterOptions.find((opt) => opt.field === condition.field)
            return (
              <Badge key={condition.id} variant="outline" className="flex items-center gap-1">
                <span>
                  {getFieldLabel(condition.field)} {getOperatorLabel(condition.operator)}{" "}
                  {formatValue(condition, fieldOption?.type)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveCondition(group.id, condition.id)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove</span>
                </Button>
              </Badge>
            )
          }),
        )}
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs">
          Clear all
        </Button>
      </div>
    </div>
  )
}
