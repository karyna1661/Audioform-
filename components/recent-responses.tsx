"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileAudio, Download } from "lucide-react"

export function RecentResponses() {
  // In a real app, this data would come from an API
  const responses = [
    {
      id: "resp1",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      questionnaire: "Customer Feedback Survey",
      date: "2023-04-20T14:30:00Z",
      status: "completed",
    },
    {
      id: "resp2",
      name: "Michael Chen",
      email: "m.chen@example.com",
      questionnaire: "Product Research Interview",
      date: "2023-04-19T10:15:00Z",
      status: "partial",
    },
    {
      id: "resp3",
      name: "Olivia Williams",
      email: "o.williams@example.com",
      questionnaire: "User Experience Survey",
      date: "2023-04-18T16:45:00Z",
      status: "completed",
    },
    {
      id: "resp4",
      name: "James Rodriguez",
      email: "j.rodriguez@example.com",
      questionnaire: "Market Research Survey",
      date: "2023-04-17T09:30:00Z",
      status: "completed",
    },
    {
      id: "resp5",
      name: "Emma Thompson",
      email: "e.thompson@example.com",
      questionnaire: "Customer Feedback Survey",
      date: "2023-04-16T13:20:00Z",
      status: "partial",
    },
  ]

  // Format date to readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <div key={response.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>{getInitials(response.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{response.name}</h4>
              <p className="text-sm text-muted-foreground">{response.questionnaire}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{formatDate(response.date)}</span>
                <Badge variant={response.status === "completed" ? "default" : "secondary"}>
                  {response.status === "completed" ? "Completed" : "Partial"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <FileAudio className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
