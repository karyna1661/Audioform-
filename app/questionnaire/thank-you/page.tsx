import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function ThankYouPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-center">Thank You!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-6">
            Your responses have been successfully recorded. We appreciate your time and valuable feedback.
          </p>

          <div className="bg-muted p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-2">What happens next?</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Your audio responses will be securely stored</li>
              <li>The group admin will review your feedback</li>
              <li>You may be contacted for follow-up questions if needed</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/" className="w-full">
            <Button className="w-full">Return to Home</Button>
          </Link>
          <div className="text-center text-sm text-muted-foreground">
            Have questions? Contact support@audioform.example.com
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
