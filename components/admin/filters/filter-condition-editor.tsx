"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { FilterCondition, FilterOption, FilterOperator } from "@/types/filters"

interface FilterConditionEditorProps {
  condition: FilterCondition
  filterOptions: FilterOption[]
  onChange: (updates: Partial<FilterCondition>) => void
}

export function FilterConditionEditor({ condition, filterOptions, onChange }: FilterConditionEditorProps) {
  const [selectedField, setSelectedField] = useState<FilterOption | undefined>(
    filterOptions.find((option) => option.field === condition.field),
  )

  // Update the selected field when the condition field changes
  useEffect(() => {
    const option = filterOptions.find((option) => option.field === condition.field)
    setSelectedField(option)
  }, [condition.field, filterOptions])

  // Handle field change
  const handleFieldChange = (field: string) => {
    const option = filterOptions.find((option) => option.field === field)
    if (option) {
      setSelectedField(option)
      onChange({
        field,
        operator: option.operators[0],
        value: "",
        valueEnd: undefined,
      })
    }
  }

  // Handle operator change
  const handleOperatorChange = (operator: FilterOperator) => {
    onChange({ operator })
  }

  // Handle value change
  const handleValueChange = (value: any) => {
    onChange({ value })
  }

  // Handle end value change (for between/range operators)
  const handleValueEndChange = (valueEnd: any) => {
    onChange({ valueEnd })
  }

  // Render the appropriate input based on the field type and operator
  const renderValueInput = () => {
    if (!selectedField) return null

    const { type, operators, options } = selectedField

    // For operators that don't need a value input
    if (
      condition.operator === "isEmpty" ||
      condition.operator === "isNotEmpty" ||
      condition.operator === "isTrue" ||
      condition.operator === "isFalse"
    ) {
      return null
    }

    // For select/multiselect fields
    if (type === "select" || type === "multiselect") {
      return (
        <Select value={String(condition.value || "")} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a value" />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={String(option.value)} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // For boolean fields
    if (type === "boolean") {
      return (
        <div className="flex items-center space-x-2">
          <Switch id="value-switch" checked={Boolean(condition.value)} onCheckedChange={handleValueChange} />
          <Label htmlFor="value-switch">{Boolean(condition.value) ? "True" : "False"}</Label>
        </div>
      )
    }

    // For date fields
    if (type === "date") {
      if (condition.operator === "before" || condition.operator === "after" || condition.operator === "onDate") {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !condition.value && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {condition.value ? format(new Date(condition.value), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={condition.value ? new Date(condition.value) : undefined}
                onSelect={(date) => handleValueChange(date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      }

      if (condition.operator === "dateRange") {
        return (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !condition.value && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {condition.value ? format(new Date(condition.value), "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={condition.value ? new Date(condition.value) : undefined}
                  onSelect={(date) => handleValueChange(date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span>to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !condition.valueEnd && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {condition.valueEnd ? format(new Date(condition.valueEnd), "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={condition.valueEnd ? new Date(condition.valueEnd) : undefined}
                  onSelect={(date) => handleValueEndChange(date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )
      }
    }

    // For number fields with between operator
    if (type === "number" && condition.operator === "between") {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={condition.value || ""}
            onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : "")}
            placeholder="Min value"
            className="w-full"
          />
          <span>to</span>
          <Input
            type="number"
            value={condition.valueEnd || ""}
            onChange={(e) => handleValueEndChange(e.target.value ? Number(e.target.value) : "")}
            placeholder="Max value"
            className="w-full"
          />
        </div>
      )
    }

    // Default input for string and number
    return (
      <Input
        type={type === "number" ? "number" : "text"}
        value={condition.value || ""}
        onChange={(e) => {
          const value = type === "number" && e.target.value ? Number(e.target.value) : e.target.value
          handleValueChange(value)
        }}
        placeholder="Enter value"
        className="w-full"
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.id} value={option.field}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedField && (
        <Select value={condition.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent>
            {selectedField.operators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {getOperatorLabel(operator)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex-1">{renderValueInput()}</div>
    </div>
  )
}

// Helper function to get a human-readable label for operators
function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    equals: "Equals",
    contains: "Contains",
    startsWith: "Starts with",
    endsWith: "Ends with",
    greaterThan: "Greater than",
    lessThan: "Less than",
    between: "Between",
    in: "In",
    notIn: "Not in",
    isTrue: "Is true",
    isFalse: "Is false",
    isEmpty: "Is empty",
    isNotEmpty: "Is not empty",
    before: "Before",
    after: "After",
    onDate: "On date",
    dateRange: "Date range",
  }
  return labels[operator] || operator
}
