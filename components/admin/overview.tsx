"use client"

import { useTheme } from "@/components/admin/theme-provider"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface OverviewProps {
  data: {
    name: string
    total: number
  }[]
}

export function Overview({ data }: OverviewProps) {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#FFFFFF" : "#000000"
  const gridColor = theme === "dark" ? "#374151" : "#E5E7EB"

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke={textColor}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
            borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
            color: textColor,
          }}
        />
        <Bar dataKey="total" fill={theme === "dark" ? "#6366F1" : "#4F46E5"} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
