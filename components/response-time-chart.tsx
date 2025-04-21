"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface ResponseTimeChartProps {
  period: string
}

export function ResponseTimeChart({ period }: ResponseTimeChartProps) {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    // In a real app, this would fetch data from an API based on the period
    // For demo purposes, we'll generate random data

    let days = 7
    if (period === "30d") days = 30
    if (period === "90d") days = 90

    // Generate data for the selected period
    const generateData = () => {
      const result = []
      const now = new Date()

      // For longer periods, we'll group by weeks or months
      if (period === "7d") {
        for (let i = 0; i < days; i++) {
          const date = new Date(now)
          date.setDate(date.getDate() - (days - 1 - i))

          result.push({
            name: date.toLocaleDateString("en-US", { weekday: "short" }),
            time: Math.floor(Math.random() * 15) + 20, // 20-35 seconds
          })
        }
      } else if (period === "30d") {
        // Group by week for 30 days
        for (let i = 0; i < 4; i++) {
          result.push({
            name: `Week ${i + 1}`,
            time: Math.floor(Math.random() * 15) + 20,
          })
        }
      } else {
        // Group by month for 90 days
        for (let i = 0; i < 3; i++) {
          const date = new Date(now)
          date.setMonth(date.getMonth() - (2 - i))

          result.push({
            name: date.toLocaleDateString("en-US", { month: "short" }),
            time: Math.floor(Math.random() * 15) + 20,
          })
        }
      }

      return result
    }

    setData(generateData())
  }, [period])

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value} seconds`, "Avg. Time"]} />
          <Line type="monotone" dataKey="time" name="Response Time" stroke="#6366f1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
