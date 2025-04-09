"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock } from "lucide-react"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import FormStatusBadge from "@/components/ui/form-status-badge"

interface Form {
  id: string
  type: string
  status: string
  createdAt: string
  data: any
}

export default function LeaderDashboard({ user }: { user: any }) {
  const [forms, setForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch("/api/forms")
        const data = await response.json()
        setForms(data)
      } catch (error) {
        console.error("Error fetching forms:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchForms()
  }, [])

  const handleCreateForm = (type: string) => {
    if (type === "leave") {
      router.push("/dashboard/leave-form")
    } else if (type === "overtime") {
      router.push("/dashboard/overtime-form")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />

      <main className="container mx-auto py-6 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Leader Dashboard</h1>
            <p className="text-muted-foreground">Manage your leave and overtime requests</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button onClick={() => handleCreateForm("leave")}>
              <FileText className="mr-2 h-4 w-4" />
              New Leave Form
            </Button>
            <Button onClick={() => handleCreateForm("overtime")}>
              <Clock className="mr-2 h-4 w-4" />
              New Overtime Form
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Forms</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <FormsList forms={forms} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="pending">
            <FormsList forms={forms.filter((form) => form.status === "pending")} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="approved">
            <FormsList forms={forms.filter((form) => form.status === "approved")} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="rejected">
            <FormsList forms={forms.filter((form) => form.status === "rejected")} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function FormsList({ forms, isLoading }: { forms: Form[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <p>Loading forms...</p>
      </div>
    )
  }

  if (forms.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-white">
        <p className="text-muted-foreground">No forms found</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {forms.map((form) => (
        <Link href={`/dashboard/form/${form.id}`} key={form.id}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {form.type === "leave" ? "Leave Request" : "Overtime Request"}
                  </CardTitle>
                  <CardDescription>Submitted on {new Date(form.createdAt).toLocaleDateString()}</CardDescription>
                </div>
                <FormStatusBadge status={form.status} />
              </div>
            </CardHeader>
            <CardContent>
              {form.type === "leave" && (
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Employees:</span>{" "}
                    {form.data.employees ? form.data.employees.length : 0}
                  </p>
                  <p>
                    <span className="font-medium">Leave Type:</span> {form.data.leaveType}
                  </p>
                  <p>
                    <span className="font-medium">Period:</span> {new Date(form.data.startDate).toLocaleDateString()} to{" "}
                    {new Date(form.data.endDate).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Total Days:</span> {form.data.totalDays}
                  </p>
                </div>
              )}
              {form.type === "overtime" && (
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Employees:</span>{" "}
                    {form.data.employees ? form.data.employees.length : 0}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {new Date(form.data.date).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Hours:</span> {form.data.hours}
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span> {form.data.reason}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <p className="text-xs text-muted-foreground">Click to view details</p>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
