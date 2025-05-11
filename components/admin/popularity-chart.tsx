"use client"

import { useTheme } from "@/components/admin/theme-provider"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Sample data - in a real app, this would come from props
const data = [
  { name: "HBO", popularity: 95 },
  { name: "ESPN", popularity: 90 },
  { name: "Netflix", popularity: 88 },
  { name: "Disney+", popularity: 85 },
  { name: "CNN", popularity: 75 },
  { name: "NBC", popularity: 72 },
  { name: "CBS", popularity: 70 },
  { name: "FOX", popularity: 68 },
]

export function PopularityChart() {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#FFFFFF" : "#000000"
  const gridColor = theme === "dark" ? "#374151" : "#E5E7EB"

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fill: textColor }} />
          <YAxis domain={[0, 100]} tick={{ fill: textColor }} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
              borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
              color: textColor,
            }}
          />
          <Bar dataKey="popularity" fill="#8884d8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
