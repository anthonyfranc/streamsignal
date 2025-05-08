"use client"

import { useTheme } from "@/components/admin/theme-provider"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

// Sample data - in a real app, this would come from props
const data = [
  { name: "Entertainment", value: 35 },
  { name: "Sports", value: 25 },
  { name: "News", value: 15 },
  { name: "Kids", value: 10 },
  { name: "Documentary", value: 8 },
  { name: "Other", value: 7 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A259FF", "#FF6B6B"]

export function CategoryDistribution() {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#FFFFFF" : "#000000"

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} channels`, "Count"]}
            contentStyle={{
              backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
              borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
              color: textColor,
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
