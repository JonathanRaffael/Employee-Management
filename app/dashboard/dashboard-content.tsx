"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardContentProps {
  initialForms: any[]
  initialStats: any
  pagination: any
}

export default function DashboardContent({ initialForms, initialStats, pagination }: DashboardContentProps) {
  const [forms, setForms] = useState(initialForms)
  const [stats, setStats] = useState(initialStats)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const loadMoreForms = async (page: number) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/forms?page=${page}&limit=10`)
        const data = await response.json()
        setForms(data.forms)
        setCurrentPage(page)
      } catch (error) {
        console.error("Error loading forms:", error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalForms || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats.byStatus?.pending || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.byStatus?.approved || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <p className="font-medium">{form.formNumber}</p>
                    <p className="text-sm text-gray-600">{form.type}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`px-2 py-1 rounded text-sm ${
                        form.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : form.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {form.status}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{new Date(form.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: Math.ceil(pagination.total / 10) }, (_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => loadMoreForms(i + 1)}
                    disabled={isPending}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
