"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion, Users, Clock, BarChart3 } from "lucide-react"

export function OverviewStats() {
  // In a real app, this data would come from an API
  const stats = [
    {
      title: "Total Questionnaires",
      value: "12",
      icon: FileQuestion,
      change: "+2 this week",
      trend: "up",
    },
    {
      title: "Total Responses",
      value: "248",
      icon: Users,
      change: "+18 this week",
      trend: "up",
    },
    {
      title: "Avg. Response Time",
      value: "28s",
      icon: Clock,
      change: "-3s from last week",
      trend: "down",
    },
    {
      title: "Completion Rate",
      value: "87%",
      icon: BarChart3,
      change: "+2% from last week",
      trend: "up",
    },
  ]

  return (
    <>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className={`text-xs ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
