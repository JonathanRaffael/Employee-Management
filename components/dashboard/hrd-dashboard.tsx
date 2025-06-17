"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Clock,
  Filter,
  Calendar,
  Clock3,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Download,
  FileDown,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import FormStatusBadge from "@/components/ui/form-status-badge"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { endOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function MonthYearPicker({
  selectedMonth,
  setSelectedMonth,
  setPagination,
}: {
  selectedMonth: { month: number; year: number } | null
  setSelectedMonth: (value: { month: number; year: number } | null) => void
  setPagination: (pagination: (prev: any) => any) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempYear, setTempYear] = useState(new Date().getFullYear())
  const [viewingYear, setViewingYear] = useState(new Date().getFullYear())

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const years = Array.from({ length: 10 }, (_, i) => viewingYear - 5 + i)

  const handleSelectMonth = (month: number) => {
    setSelectedMonth({ month, year: tempYear })
    setIsOpen(false)
    // Reset to page 1 when changing month
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearSelection = () => {
    setSelectedMonth(null)
    setIsOpen(false)
    // Reset to page 1 when clearing selection
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[200px] justify-start text-left font-normal border-slate-300 dark:border-slate-700"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedMonth ? `${months[selectedMonth.month]} ${selectedMonth.year}` : "Select month"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Select month</h3>
            {selectedMonth && (
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
          <div className="flex justify-between items-center mb-2">
            <Button variant="ghost" size="sm" onClick={() => setViewingYear(viewingYear - 1)} className="h-7 px-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={tempYear.toString()} onValueChange={(value) => setTempYear(Number.parseInt(value))}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue>{tempYear}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setViewingYear(viewingYear + 1)} className="h-7 px-2">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          {months.map((month, index) => (
            <Button
              key={month}
              variant="outline"
              size="sm"
              className={`h-9 ${
                selectedMonth?.month === index && selectedMonth?.year === tempYear
                  ? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                  : ""
              }`}
              onClick={() => handleSelectMonth(index)}
            >
              {month.substring(0, 3)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface Form {
  id: string
  type: string
  status: string
  createdAt: string
  data: any
  employee: {
    name: string
    employeeId: string
    department: string
    position: string
  }
}

// Add this interface near the top of the file, after the Form interface
interface Employee {
  name: string
  employeeId: string
  department: string
  position: string
  id?: string
}

interface PaginationData {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

function LeaveRequestCard({ form, deleteForm }: { form: Form; deleteForm: (formId: string) => void }) {
  return (
    <Card className="h-full border-l-4 border-l-slate-500 dark:border-l-slate-400 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              Leave Request
            </CardTitle>
            <CardDescription>
              <div className="flex flex-wrap gap-1">
                {form.data.employees && form.data.employees.length > 0 ? (
                  form.data.employees.map((emp: Employee, index: number) => (
                    <span key={emp.employeeId || index}>
                      {index > 0 && <span className="mx-1">•</span>}
                      {emp.name} <span className="text-slate-400">({emp.employeeId})</span>
                    </span>
                  ))
                ) : (
                  <span>
                    {form.employee.name} <span className="text-slate-400">({form.employee.employeeId})</span>
                  </span>
                )}
              </div>
              <div className="mt-1">
                {form.data.employees && form.data.employees[0]
                  ? form.data.employees[0].department
                  : form.employee.department}
              </div>
            </CardDescription>
          </div>
          <FormStatusBadge status={form.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Leave Type:</span> <span>{form.data.leaveType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Period:</span>{" "}
            <span>
              {new Date(form.data.startDate).toLocaleDateString()} to {new Date(form.data.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Total Days:</span>{" "}
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
              {form.data.totalDays}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Link href={`/dashboard/form/${form.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View details
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
        <div className="flex gap-1">
          {form.status === "pending" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Approve Request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reject Request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteForm(form.id)}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Form</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  )
}

function OvertimeRequestCard({ form, deleteForm }: { form: Form; deleteForm: (formId: string) => void }) {
  return (
    <Card className="h-full border-l-4 border-l-slate-500 dark:border-l-slate-400 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-500" />
              Overtime Request
            </CardTitle>
            <CardDescription>
              <div className="flex flex-wrap gap-1">
                {form.data.employees && form.data.employees.length > 0 ? (
                  form.data.employees.map((emp: Employee, index: number) => (
                    <span key={emp.employeeId || index}>
                      {index > 0 && <span className="mx-1">•</span>}
                      {emp.name} <span className="text-slate-400">({emp.employeeId})</span>
                    </span>
                  ))
                ) : (
                  <span>
                    {form.employee.name} <span className="text-slate-400">({form.employee.employeeId})</span>
                  </span>
                )}
              </div>
              <div className="mt-1">
                {form.data.employees && form.data.employees[0]
                  ? form.data.employees[0].department
                  : form.employee.department}
              </div>
            </CardDescription>
          </div>
          <FormStatusBadge status={form.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Date:</span> <span>{new Date(form.data.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Hours:</span>{" "}
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
              {form.data.hours}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
            <div>
              <span className="font-medium">Reason:</span> <p className="line-clamp-2 mt-0.5">{form.data.reason}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Link href={`/dashboard/form/${form.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View details
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
        <div className="flex gap-1">
          {form.status === "pending" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Approve Request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reject Request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteForm(form.id)}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Form</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function HRDDashboard({ user }: { user: any }) {
  const [forms, setForms] = useState<Form[]>([])
  const [filteredForms, setFilteredForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [sortOption, setSortOption] = useState("newest")

  // Pagination state
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formToDelete, setFormToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [departmentFilter, setDepartmentFilter] = useState("all")
  const departments = useMemo(() => {
    const depts = new Set<string>()
    // Check if forms is an array before using forEach
    if (Array.isArray(forms)) {
      forms.forEach((form) => {
        if (form.employee?.department) {
          depts.add(form.employee.department)
        }
      })
    }
    return Array.from(depts)
  }, [forms])

  const [timeFilter, setTimeFilter] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null)
  const [requestTypeFilter, setRequestTypeFilter] = useState<"all" | "leave" | "overtime">("all")

  // Function to filter forms by time range (month or predefined period)
  const filterFormsByTimeRange = (forms: Form[]) => {
    if (!Array.isArray(forms)) return []

    // If month is selected, filter by that month
    if (selectedMonth) {
      return forms.filter((form) => {
        const formDate = new Date(form.createdAt)
        return formDate.getMonth() === selectedMonth.month && formDate.getFullYear() === selectedMonth.year
      })
    }

    // Otherwise use the time filter
    if (timeFilter === "all") return forms

    const now = new Date()
    let start: Date
    let end: Date = endOfDay(now)

    switch (timeFilter) {
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case "month":
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case "year":
        start = startOfYear(now)
        end = endOfYear(now)
        break
      default:
        return forms
    }

    return forms.filter((form) => {
      const formDate = new Date(form.createdAt)
      return formDate >= start && formDate <= end
    })
  }

  // Export functions
  const downloadAsExcel = () => {
    // Build the query parameters
    const params = new URLSearchParams()
    params.append("format", "excel")
    params.append("getAllForms", "true") // Add this parameter to get all forms

    if (selectedMonth) {
      params.append("selectedMonth", JSON.stringify(selectedMonth))
    } else if (timeFilter !== "all") {
      params.append("timeFilter", timeFilter)
    }

    if (requestTypeFilter !== "all") {
      params.append("type", requestTypeFilter)
    }

    if (departmentFilter !== "all") {
      params.append("department", departmentFilter)
    }

    // Trigger file download
    window.location.href = `/api/forms?${params.toString()}`
  }

  // Modify the downloadAsPDF function
  const downloadAsPDF = () => {
    // Build the query parameters
    const params = new URLSearchParams()
    params.append("format", "pdf")
    params.append("getAllForms", "true") // Add this parameter to get all forms

    if (selectedMonth) {
      params.append("selectedMonth", JSON.stringify(selectedMonth))
    } else if (timeFilter !== "all") {
      params.append("timeFilter", timeFilter)
    }

    if (requestTypeFilter !== "all") {
      params.append("type", requestTypeFilter)
    }

    if (departmentFilter !== "all") {
      params.append("department", departmentFilter)
    }

    // Trigger file download
    window.location.href = `/api/forms?${params.toString()}`
  }

  // Modify the downloadLeaveFormsAsExcel function
  const downloadLeaveFormsAsExcel = () => {
    // Build the query parameters
    const params = new URLSearchParams()
    params.append("format", "excel")
    params.append("type", "leave")
    params.append("getAllForms", "true") // Add this parameter to get all forms

    if (selectedMonth) {
      params.append("selectedMonth", JSON.stringify(selectedMonth))
    } else if (timeFilter !== "all") {
      params.append("timeFilter", timeFilter)
    }

    if (departmentFilter !== "all") {
      params.append("department", departmentFilter)
    }

    // Trigger file download
    window.location.href = `/api/forms?${params.toString()}`
  }

  // Modify the downloadOvertimeFormsAsExcel function
  const downloadOvertimeFormsAsExcel = () => {
    // Build the query parameters
    const params = new URLSearchParams()
    params.append("format", "excel")
    params.append("type", "overtime")
    params.append("getAllForms", "true") // Add this parameter to get all forms

    if (selectedMonth) {
      params.append("selectedMonth", JSON.stringify(selectedMonth))
    } else if (timeFilter !== "all") {
      params.append("timeFilter", timeFilter)
    }

    if (departmentFilter !== "all") {
      params.append("department", departmentFilter)
    }

    // Trigger file download
    window.location.href = `/api/forms?${params.toString()}`
  }

  // Modify the downloadLeaveFormsAsPDF function
  const downloadLeaveFormsAsPDF = () => {
    // Build the query parameters
    const params = new URLSearchParams()
    params.append("format", "pdf")
    params.append("type", "leave")
    params.append("getAllForms", "true") // Add this parameter to get all forms

    if (selectedMonth) {
      params.append("selectedMonth", JSON.stringify(selectedMonth))
    } else if (timeFilter !== "all") {
      params.append("timeFilter", timeFilter)
    }

    if (departmentFilter !== "all") {
      params.append("department", departmentFilter)
    }

    // Trigger file download
    window.location.href = `/api/forms?${params.toString()}`
  }

  // Modify the downloadOvertimeFormsAsPDF function
  const downloadOvertimeFormsAsPDF = () => {
    // Build the query parameters
    const params = new URLSearchParams()
    params.append("format", "pdf")
    params.append("type", "overtime")
    params.append("getAllForms", "true") // Add this parameter to get all forms

    if (selectedMonth) {
      params.append("selectedMonth", JSON.stringify(selectedMonth))
    } else if (timeFilter !== "all") {
      params.append("timeFilter", timeFilter)
    }

    if (departmentFilter !== "all") {
      params.append("department", departmentFilter)
    }

    // Trigger file download
    window.location.href = `/api/forms?${params.toString()}`
  }

  // Enhanced delete form function with confirmation dialog
  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!formToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/forms/${formToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Remove from local state
        setForms((prevForms) => prevForms.filter((form) => form.id !== formToDelete))
        setFilteredForms((prevForms) => prevForms.filter((form) => form.id !== formToDelete))

        // Update pagination total
        setPagination((prev) => ({
          ...prev,
          total: prev.total - 1,
        }))

        // Close dialog and reset state
        setShowDeleteDialog(false)
        setFormToDelete(null)
      } else {
        throw new Error("Failed to delete form")
      }
    } catch (error) {
      console.error("Error deleting form:", error)
      alert("Failed to delete form. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setShowDeleteDialog(false)
    setFormToDelete(null)
  }

  const fetchForms = async (page = 1, status = activeTab) => {
    setIsLoading(true)
    try {
      // First, fetch all forms for statistics and filtering (without pagination)
      const statsParams = new URLSearchParams()

      if (status !== "all") {
        statsParams.append("status", status)
      }

      if (selectedMonth) {
        const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
        const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
        statsParams.append("startDate", startDate.toISOString())
        statsParams.append("endDate", endDate.toISOString())
      } else if (timeFilter !== "all") {
        const { start, end } = getTimeFilterDates(timeFilter)
        statsParams.append("startDate", start.toISOString())
        statsParams.append("endDate", end.toISOString())
      }

      if (requestTypeFilter !== "all") {
        statsParams.append("type", requestTypeFilter)
      }

      if (departmentFilter !== "all") {
        statsParams.append("department", departmentFilter)
      }

      // Add a parameter to get all forms without pagination
      statsParams.append("getAllForms", "true")

      const statsResponse = await fetch(`/api/forms/stats?${statsParams.toString()}`)
      const statsResult = await statsResponse.json()

      // Set the complete forms data for statistics calculations
      const allForms = statsResult.data || statsResult
      setForms(Array.isArray(allForms) ? allForms : [])

      // Now fetch paginated data for display
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", pagination.limit.toString())

      if (status !== "all") {
        params.append("status", status)
      }

      if (selectedMonth) {
        const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
        const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
        params.append("startDate", startDate.toISOString())
        params.append("endDate", endDate.toISOString())
      } else if (timeFilter !== "all") {
        const { start, end } = getTimeFilterDates(timeFilter)
        params.append("startDate", start.toISOString())
        params.append("endDate", end.toISOString())
      }

      if (requestTypeFilter !== "all") {
        params.append("type", requestTypeFilter)
      }

      if (departmentFilter !== "all") {
        params.append("department", departmentFilter)
      }

      const response = await fetch(`/api/forms?${params.toString()}`)
      const result = await response.json()

      // Check if the response has a data property (paginated response)
      if (result.data) {
        setFilteredForms(Array.isArray(result.data) ? result.data : [])

        // Update pagination state if available
        if (result.pagination) {
          setPagination(result.pagination)
        }
      } else {
        // Handle the case where the response is directly an array
        setFilteredForms(Array.isArray(result) ? result : [])
      }
    } catch (error) {
      console.error("Error fetching forms:", error)
      // Initialize with empty arrays on error
      setForms([])
      setFilteredForms([])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get date ranges for predefined time filters
  const getTimeFilterDates = (filter: string) => {
    const now = new Date()
    let start: Date
    let end: Date = endOfDay(now)

    switch (filter) {
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
      case "month":
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case "year":
        start = startOfYear(now)
        end = endOfYear(now)
        break
      default:
        start = now
        end = now
    }

    return { start, end }
  }

  useEffect(() => {
    // Reset to page 1 when filters change
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchForms(1, activeTab)
  }, [activeTab, selectedMonth, timeFilter, requestTypeFilter, departmentFilter])

  useEffect(() => {
    // Filter forms based on active tab and time filter
    if (!Array.isArray(forms)) {
      setFilteredForms([])
      return
    }

    let result = [...forms]

    // Apply tab filter
    if (activeTab !== "all") {
      result = result.filter((form) => form.status === activeTab)
    }

    // Apply department filter
    if (departmentFilter !== "all") {
      result = result.filter((form) => form.employee?.department === departmentFilter)
    }

    // Apply time filter or date range filter
    result = filterFormsByTimeRange(result)

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortOption === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return 0
    })

    // Apply request type filter
    if (requestTypeFilter !== "all") {
      result = result.filter((form) => form.type === requestTypeFilter)
    }

    setFilteredForms(result)
  }, [activeTab, forms, sortOption, timeFilter, selectedMonth, departmentFilter, requestTypeFilter])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const handlePageChange = (newPage: number) => {
    fetchForms(newPage, activeTab)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    // Ensure forms is an array before calculating stats
    const formsArray = Array.isArray(forms) ? forms : []

    const totalLeave = formsArray.filter((form) => form.type === "leave").length
    const totalOvertime = formsArray.filter((form) => form.type === "overtime").length
    const pendingLeave = formsArray.filter((form) => form.type === "leave" && form.status === "pending").length
    const pendingOvertime = formsArray.filter((form) => form.type === "overtime" && form.status === "pending").length
    const approvedLeave = formsArray.filter((form) => form.type === "leave" && form.status === "approved").length
    const approvedOvertime = formsArray.filter((form) => form.type === "overtime" && form.status === "approved").length
    const rejectedLeave = formsArray.filter((form) => form.type === "leave" && form.status === "rejected").length
    const rejectedOvertime = formsArray.filter((form) => form.type === "overtime" && form.status === "rejected").length

    return {
      totalLeave,
      totalOvertime,
      pendingLeave,
      pendingOvertime,
      approvedLeave,
      approvedOvertime,
      rejectedLeave,
      rejectedOvertime,
      pendingLeavePercent: totalLeave ? Math.round((pendingLeave / totalLeave) * 100) : 0,
      pendingOvertimePercent: totalOvertime ? Math.round((pendingOvertime / totalOvertime) * 100) : 0,
      totalRequests: pagination.total || formsArray.length || 100, // Default to 100 if no data available
    }
  }, [forms, pagination.total])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <DashboardHeader user={user} />

      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">HRD Dashboard</h1>
            <p className="text-muted-foreground mt-1">Review and approve employee requests</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.pendingLeave + stats.pendingOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  Needs Action
                </Badge>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Leave ({stats.pendingLeave})</span>
                  <span>{stats.pendingLeavePercent}%</span>
                </div>
                <Progress value={stats.pendingLeavePercent} className="h-1.5 bg-slate-100 dark:bg-slate-700" />
                <div className="flex justify-between text-xs">
                  <span>Overtime ({stats.pendingOvertime})</span>
                  <span>{stats.pendingOvertimePercent}%</span>
                </div>
                <Progress value={stats.pendingOvertimePercent} className="h-1.5 bg-slate-100 dark:bg-slate-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.approvedLeave + stats.approvedOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approved
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Leave</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.approvedLeave}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Overtime</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.approvedOvertime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.rejectedLeave + stats.rejectedOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Rejected
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Leave</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.rejectedLeave}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Overtime</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.rejectedOvertime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.totalRequests || 100}</div>
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  All Time
                </Badge>
              </div>
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Leave
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-slate-600 dark:text-slate-300">
                        {stats.totalRequests ? Math.round((stats.totalLeave / stats.totalRequests) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                    <div
                      style={{
                        width: `${stats.totalRequests ? Math.round((stats.totalLeave / stats.totalRequests) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-500"
                    ></div>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Overtime
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-slate-600 dark:text-slate-300">
                        {stats.totalRequests ? Math.round((stats.totalOvertime / stats.totalRequests) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                    <div
                      style={{
                        width: `${stats.totalRequests ? Math.round((stats.totalOvertime / stats.totalRequests) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-500"
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Card className="border-slate-300 dark:border-slate-700">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-slate-500" />
                      <div>
                        <h3 className="font-medium text-sm">Quick Summary</h3>
                        <p className="text-xs text-muted-foreground">
                          {filteredForms.length} forms shown of {stats.totalRequests} total
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                      >
                        {stats.pendingLeave + stats.pendingOvertime} Pending
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        {stats.approvedLeave + stats.approvedOvertime} Approved
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex gap-2 flex-wrap">
              <MonthYearPicker
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                setPagination={setPagination}
              />

              <Select
                value={timeFilter}
                onValueChange={(value) => {
                  setTimeFilter(value)
                  // Clear date range when selecting a predefined time filter
                  if (value !== "all") {
                    setSelectedMonth(null)
                  }
                }}
              >
                <SelectTrigger className="w-[140px] border-slate-300 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <SelectValue placeholder="Time Period" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <FileDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export All Forms</DropdownMenuLabel>
                  <DropdownMenuItem onClick={downloadAsPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    All Forms as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadAsExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    All Forms as Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Export Leave Forms</DropdownMenuLabel>
                  <DropdownMenuItem onClick={downloadLeaveFormsAsPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Leave Forms as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadLeaveFormsAsExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Leave Forms as Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Export Overtime Forms</DropdownMenuLabel>
                  <DropdownMenuItem onClick={downloadOvertimeFormsAsPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Overtime Forms as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadOvertimeFormsAsExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Overtime Forms as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Request Type</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by request type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRequestTypeFilter("all")}>
                    All Requests
                    {requestTypeFilter === "all" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRequestTypeFilter("leave")}>
                    Leave Requests
                    {requestTypeFilter === "leave" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRequestTypeFilter("overtime")}>
                    Overtime Requests
                    {requestTypeFilter === "overtime" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(timeFilter !== "all" || selectedMonth) && (
            <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-md flex items-center dark:bg-slate-800 dark:border-slate-700">
              <Calendar className="h-5 w-5 text-slate-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {selectedMonth ? (
                  <>
                    Showing forms for{" "}
                    <span className="font-medium">
                      {new Date(selectedMonth.year, selectedMonth.month).toLocaleString("default", { month: "long" })}{" "}
                      {selectedMonth.year}
                    </span>
                  </>
                ) : timeFilter !== "all" ? (
                  <>
                    Showing forms for{" "}
                    <span className="font-medium">
                      {timeFilter === "week" ? "this week" : timeFilter === "month" ? "this month" : "this year"}
                    </span>
                  </>
                ) : null}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={() => {
                  setTimeFilter("all")
                  setSelectedMonth(null)
                  // Reset to page 1 when clearing filters
                  setPagination((prev) => ({ ...prev, page: 1 }))
                  // Refetch forms without date filters
                  fetchForms(1, activeTab)
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="mb-6 grid grid-cols-4 w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger
              value="all"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-200"
            >
              All Forms
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-200"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-200"
            >
              Approved
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-200"
            >
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} deleteForm={handleDeleteClick} />
          </TabsContent>

          <TabsContent value="pending">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} deleteForm={handleDeleteClick} />
          </TabsContent>

          <TabsContent value="approved">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} deleteForm={handleDeleteClick} />
          </TabsContent>

          <TabsContent value="rejected">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} deleteForm={handleDeleteClick} />
          </TabsContent>
        </Tabs>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredForms.length} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Trash2 className="h-5 w-5 text-red-500" />
                Confirm Delete
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                Are you sure you want to delete this form? This action cannot be undone and will permanently remove all
                associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={cancelDelete}
                disabled={isDeleting}
                className="border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

function CombinedFormsList({
  forms,
  isLoading,
  deleteForm,
}: { forms: Form[]; isLoading: boolean; deleteForm: (formId: string) => void }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse w-full">
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div>
              </div>
              <div className="grid grid-cols-5 gap-4 mt-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (forms.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No requests found</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            There are no requests matching your current filters. Try changing your search criteria.
          </p>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <Filter className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {forms.map((form) => (
                <tr key={form.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-4 whitespace-nowrap">
                    {form.type === "leave" ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Leave</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Clock3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Overtime</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {form.data.employees && form.data.employees.length > 0 ? (
                        form.data.employees.map((emp: Employee, index: number) => (
                          <div key={`${emp.employeeId}-${index}`} className="text-sm">
                            <span className="font-medium">{emp.name}</span>{" "}
                            <span className="text-slate-500">({emp.employeeId})</span>
                            {index < form.data.employees.length - 1 && <span className="ml-1 mr-1">•</span>}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm">
                          <span className="font-medium">{form.employee?.name || "-"}</span>{" "}
                          <span className="text-slate-500">({form.employee?.employeeId || "-"})</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {form.data.employees && form.data.employees[0]
                        ? form.data.employees[0].department
                        : form.employee?.department || "-"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {form.data.employees && form.data.employees[0]
                        ? form.data.employees[0].position
                        : form.employee?.position || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {form.type === "leave" ? (
                      <div className="text-sm">
                        <div>
                          <span className="font-medium">Type:</span> {form.data.leaveType}
                        </div>
                        <div>
                          <span className="font-medium">Period:</span>{" "}
                          {new Date(form.data.startDate).toLocaleDateString()} -{" "}
                          {new Date(form.data.endDate).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Days:</span>{" "}
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                            {form.data.totalDays}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <div>
                          <span className="font-medium">Date:</span> {new Date(form.data.date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Hours:</span>{" "}
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                            {form.data.hours}
                          </span>
                        </div>
                        <div className="max-w-xs">
                          <span className="font-medium">Reason:</span>{" "}
                          <span className="line-clamp-1">{form.data.reason}</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <FormStatusBadge status={form.status} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/form/${form.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-medium flex items-center transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </Link>
                      {form.status === "pending" && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Approve Request</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reject Request</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteForm(form.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Form</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
