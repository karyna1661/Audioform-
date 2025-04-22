"use client"

import { useState } from "react"
import { useRequireAdmin } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { OverviewStats } from "@/components/overview-stats"
import { RecentResponses } from "@/components/recent-responses"
import { CompletionChart } from "@/components/completion-chart"
import { ResponseTimeChart } from "@/components/response-time-chart"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminDashboard() {
  const { user, status } = useRequireAdmin()
  const [selectedPeriod, setSelectedPeriod] = useState("7d")

  // Show loading state while checking authentication
  if (status === "loading") {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader title="Dashboard" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}</h1>
            <p className="text-muted-foreground">Here's what's happening with your questionnaires today.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <OverviewStats />
          </div>

          <Tabs defaultValue="overview" className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="responses">Responses</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button
                  variant={selectedPeriod === "7d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod("7d")}
                >
                  7 days
                </Button>
                <Button
                  variant={selectedPeriod === "30d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod("30d")}
                >
                  30 days
                </Button>
                <Button
                  variant={selectedPeriod === "90d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod("90d")}
                >
                  90 days
                </Button>
              </div>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Rate</CardTitle>
                    <CardDescription>Percentage of questionnaires completed vs. started</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompletionChart period={selectedPeriod} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Response Time</CardTitle>
                    <CardDescription>Average time spent per question in seconds</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponseTimeChart period={selectedPeriod} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Responses</CardTitle>
                  <CardDescription>Your latest questionnaire submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentResponses />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analytics</CardTitle>
                  <CardDescription>In-depth analysis of your questionnaire performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Detailed analytics content will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="responses" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Responses</CardTitle>
                  <CardDescription>Complete list of all questionnaire responses</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">All responses will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="w-64 border-r bg-white">
        <Skeleton className="h-12 w-32 m-4" />
        <div className="px-4 py-2">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
        </div>
      </div>
      <div className="flex-1">
        <div className="h-16 border-b bg-white px-6 flex items-center">
          <Skeleton className="h-8 w-48" />
        </div>
        <main className="p-6">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
          </div>

          <Skeleton className="h-10 w-64 mb-4" />
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    </div>
  )
}
