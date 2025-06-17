"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Clock,
  Search,
  Filter,
  Calendar,
  Clock3,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  SlidersHorizontal,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Users,
  Check,
  X,
  FileDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import FormStatusBadge from "@/components/ui/form-status-badge"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  isWithinInterval,
} from "date-fns"
import { jsPDF } from "jspdf"
import * as XLSX from "xlsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { subDays } from "date-fns"
import { toast } from "@/components/ui/use-toast"

function DateRangePicker({
  dateRange,
  setDateRange,
}: {
  dateRange: { start: Date | null; end: Date | null }
  setDateRange: (range: { start: Date | null; end: Date | null }) => void
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const handleSelect = (date: Date | undefined) => {
    if (!date) return

    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      // If no start date or both dates are selected, set start date
      setDateRange({ start: date, end: null })
    } else {
      // If only start date is selected and the new date is after start date
      if (date < dateRange.start) {
        setDateRange({ start: date, end: dateRange.start })
      } else {
        setDateRange({ start: dateRange.start, end: date })
      }
      setIsCalendarOpen(false)
    }
  }

  const clearDateRange = () => {
    setDateRange({ start: null, end: null })
    setIsCalendarOpen(false)
  }

  const predefinedRanges = [
    { label: "Today", range: () => ({ start: new Date(), end: new Date() }) },
    { label: "Yesterday", range: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
    { label: "Last 7 days", range: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
    { label: "Last 30 days", range: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
    { label: "This month", range: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
    {
      label: "Last month",
      range: () => {
        const today = new Date()
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1)
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        }
      },
    },
  ]

  return (
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-start text-left font-normal w-[260px] border-slate-300 dark:border-slate-700 ${dateRange.start ? "text-foreground" : "text-muted-foreground"}`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {dateRange.start ? (
            dateRange.end ? (
              <>
                {format(dateRange.start, "MMM d, yyyy")} - {format(dateRange.end, "MMM d, yyyy")}
              </>
            ) : (
              format(dateRange.start, "MMM d, yyyy")
            )
          ) : (
            "Select date range"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Select range</h3>
            {(dateRange.start || dateRange.end) && (
              <Button variant="ghost" size="sm" onClick={clearDateRange} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {predefinedRanges.map((range, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-7 text-xs justify-start"
                onClick={() => {
                  setDateRange(range.range())
                  setIsCalendarOpen(false)
                }}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
        <CalendarComponent
          mode="range"
          selected={{
            from: dateRange.start || undefined,
            to: dateRange.end || undefined,
          }}
          onSelect={(range) => {
            if (range?.from) {
              setDateRange({
                start: range.from,
                end: range.to || null,
              })
              if (range.to) {
                setIsCalendarOpen(false)
              }
            }
          }}
          numberOfMonths={2}
          defaultMonth={dateRange.start || undefined}
          className="p-3"
        />
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

interface PaginationData {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

function OvertimeRequestCard({
  form,
  onApprove,
  onReject,
}: { form: Form; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px] border-l-4 border-l-cyan-500 dark:border-l-cyan-400 overflow-hidden group relative">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-cyan-500/5 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:to-cyan-500/5 transition-all duration-300"></div>
      <CardHeader className="pb-2 relative">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-cyan-500" />
              Overtime Request
            </CardTitle>
            <CardDescription>
              {form.employee.name} ({form.employee.employeeId}) - {form.employee.department}
            </CardDescription>
          </div>
          <FormStatusBadge status={form.status} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Date:</span> <span>{new Date(form.data.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Hours:</span>{" "}
            <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded text-xs font-medium">
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
      <CardFooter className="pt-0 relative flex justify-between">
        <Link href={`/dashboard/form/${form.id}`} className="block z-10">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-cyan-600 dark:text-cyan-400 font-medium flex items-center group-hover:gap-2 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-900/20 relative z-10"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View details
            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        {form.status === "pending" && (
          <div className="flex gap-1 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-900/20 relative z-10"
                    onClick={() => onApprove(form.id)}
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
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 relative z-10"
                    onClick={() => onReject(form.id)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reject Request</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default function PMCDashboard({ user }: { user: any }) {
  const [forms, setForms] = useState<Form[]>([])
  const [filteredForms, setFilteredForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sortOption, setSortOption] = useState("newest")
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  // Pagination state
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

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
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  const filterFormsByTimeRange = (forms: Form[]) => {
    // If custom date range is selected, use that
    if (dateRange.start && dateRange.end) {
      return forms.filter((form) => {
        const formDate = new Date(form.createdAt)
        return isWithinInterval(formDate, {
          start: dateRange.start ? startOfDay(dateRange.start) : new Date(),
          end: dateRange.end ? endOfDay(dateRange.end) : new Date(),
        })
      })
    }

    // Otherwise use the time filter
    if (timeFilter === "all") return forms

    const now = new Date()
    let start: Date
    let end: Date

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
      return isWithinInterval(formDate, { start, end })
    })
  }

  const downloadAsPDF = () => {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(18)
    doc.text("Overtime Approval Report", 14, 22)

    // Add date range if applicable
    if (dateRange.start && dateRange.end) {
      doc.setFontSize(12)
      doc.text(`Period: ${format(dateRange.start, "dd/MM/yyyy")} - ${format(dateRange.end, "dd/MM/yyyy")}`, 14, 30)
    }

    // Add table headers
    doc.setFontSize(10)
    doc.text("Employee", 14, 40)
    doc.text("Date", 60, 40)
    doc.text("Hours", 90, 40)
    doc.text("Status", 120, 40)
    doc.text("Department", 150, 40)

    // Add table content
    let y = 50
    const formsToExport = filterFormsByTimeRange(forms)

    formsToExport.forEach((form, index) => {
      doc.text(form.employee.name, 14, y)
      doc.text(new Date(form.data.date).toLocaleDateString(), 60, y)
      doc.text(form.data.hours.toString(), 90, y)
      doc.text(form.status, 120, y)
      doc.text(form.employee.department, 150, y)

      y += 10

      // Add new page if needed
      if (y > 280) {
        doc.addPage()
        y = 20
      }
    })

    // Save the PDF
    const dateStr = format(new Date(), "yyyy-MM-dd")
    doc.save(`overtime-approvals-${dateStr}.pdf`)
  }

  const downloadAsExcel = () => {
    const formsToExport = filterFormsByTimeRange(forms)

    // Prepare data for Excel
    const data = formsToExport.map((form) => {
      return {
        "Employee Name": form.employee.name,
        "Employee ID": form.employee.employeeId,
        Department: form.employee.department,
        Position: form.employee.position,
        "Overtime Date": new Date(form.data.date).toLocaleDateString(),
        "Start Time": form.data.startTime || "N/A",
        "End Time": form.data.endTime || "N/A",
        "Total Hours": form.data.hours,
        Reason: form.data.reason || "N/A",
        Status: form.status,
        "Submission Date": new Date(form.createdAt).toLocaleDateString(),
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data)

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Overtime Approvals")

    // Generate Excel file
    const dateStr = format(new Date(), "yyyy-MM-dd")
    XLSX.writeFile(wb, `overtime-approvals-${dateStr}.xlsx`)
  }

  const fetchForms = async (page = 1, status = activeTab) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", pagination.limit.toString())
      params.append("type", "overtime") // Only fetch overtime forms

      if (status !== "all") {
        params.append("status", status)
      }

      const response = await fetch(`/api/forms?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Error fetching forms: ${response.status}`)
      }

      const result = await response.json()

      // Check if the response has a data property (paginated response)
      if (result.data) {
        setForms(result.data)
        setFilteredForms(result.data)

        // Update pagination state if available
        if (result.pagination) {
          setPagination(result.pagination)
        }
      } else {
        // Handle the case where the response is directly an array
        setForms(result)
        setFilteredForms(result)
      }
    } catch (error) {
      console.error("Error fetching forms:", error)
      toast({
        title: "Error",
        description: "Failed to load overtime requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveForm = async (id: string) => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/forms/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error approving form: ${response.status}`)
      }

      // Update the local state to reflect the change
      setForms((prevForms) => prevForms.map((form) => (form.id === id ? { ...form, status: "approved" } : form)))

      toast({
        title: "Success",
        description: "Overtime request has been approved.",
        variant: "default",
      })

      // Refresh the data
      fetchForms(pagination.page, activeTab)
    } catch (error) {
      console.error("Error approving form:", error)
      toast({
        title: "Error",
        description: "Failed to approve overtime request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleRejectForm = async (id: string) => {
    setIsRejecting(true)
    try {
      const response = await fetch(`/api/forms/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error rejecting form: ${response.status}`)
      }

      // Update the local state to reflect the change
      setForms((prevForms) => prevForms.map((form) => (form.id === id ? { ...form, status: "rejected" } : form)))

      toast({
        title: "Success",
        description: "Overtime request has been rejected.",
        variant: "default",
      })

      // Refresh the data
      fetchForms(pagination.page, activeTab)
    } catch (error) {
      console.error("Error rejecting form:", error)
      toast({
        title: "Error",
        description: "Failed to reject overtime request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const handleBatchApprove = async () => {
    setIsApproving(true)
    try {
      const pendingFormIds = forms.filter((form) => form.status === "pending").map((form) => form.id)

      if (pendingFormIds.length === 0) {
        toast({
          title: "Info",
          description: "No pending overtime requests to approve.",
          variant: "default",
        })
        return
      }

      const response = await fetch(`/api/forms/batch-approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: pendingFormIds }),
      })

      if (!response.ok) {
        throw new Error(`Error batch approving forms: ${response.status}`)
      }

      toast({
        title: "Success",
        description: `${pendingFormIds.length} overtime requests have been approved.`,
        variant: "default",
      })

      // Refresh the data
      fetchForms(pagination.page, activeTab)
    } catch (error) {
      console.error("Error batch approving forms:", error)
      toast({
        title: "Error",
        description: "Failed to approve overtime requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  useEffect(() => {
    fetchForms(1, activeTab)
  }, [activeTab])

  useEffect(() => {
    // Filter forms based on search query, active tab, and time filter
    let result = forms

    // Apply tab filter
    if (activeTab !== "all") {
      result = result.filter((form) => form.status === activeTab)
    }

    // Apply department filter
    if (departmentFilter !== "all") {
      result = result.filter((form) => form.employee.department === departmentFilter)
    }

    // Apply time filter or date range filter
    result = filterFormsByTimeRange(result)

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((form) => {
        // Search in employee name, ID, department
        if (form.employee.name.toLowerCase().includes(query)) return true
        if (form.employee.employeeId.toLowerCase().includes(query)) return true
        if (form.employee.department.toLowerCase().includes(query)) return true

        // Search in reason
        if (form.data.reason && form.data.reason.toLowerCase().includes(query)) return true

        return false
      })
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else if (sortOption === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return 0
    })

    setFilteredForms(result)
  }, [searchQuery, activeTab, forms, sortOption, timeFilter, dateRange, departmentFilter])

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

    const totalOvertime = formsArray.length
    const pendingOvertime = formsArray.filter((form) => form.status === "pending").length
    const approvedOvertime = formsArray.filter((form) => form.status === "approved").length
    const rejectedOvertime = formsArray.filter((form) => form.status === "rejected").length

    // Calculate total hours by status
    const totalHours = formsArray.reduce((sum, form) => sum + Number.parseFloat(form.data.hours || 0), 0)
    const pendingHours = formsArray
      .filter((form) => form.status === "pending")
      .reduce((sum, form) => sum + Number.parseFloat(form.data.hours || 0), 0)
    const approvedHours = formsArray
      .filter((form) => form.status === "approved")
      .reduce((sum, form) => sum + Number.parseFloat(form.data.hours || 0), 0)
    const rejectedHours = formsArray
      .filter((form) => form.status === "rejected")
      .reduce((sum, form) => sum + Number.parseFloat(form.data.hours || 0), 0)

    return {
      totalOvertime,
      pendingOvertime,
      approvedOvertime,
      rejectedOvertime,
      pendingOvertimePercent: totalOvertime ? Math.round((pendingOvertime / totalOvertime) * 100) : 0,
      totalHours,
      pendingHours,
      approvedHours,
      rejectedHours,
    }
  }, [forms])

  return (
    <div className="min-h-screen bg-cyan-50/50 dark:bg-slate-900">
      <DashboardHeader user={user} />

      <main className="container mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              PMC Overtime Approval
            </h1>
            <p className="text-muted-foreground mt-1">Review and approve employee overtime requests</p>
          </div>
        </motion.div>

        {filteredForms.filter((form) => form.status === "pending").length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-6"
          >
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 dark:bg-amber-800/30 p-2 rounded-full">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Pending Overtime Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      You have {filteredForms.filter((form) => form.status === "pending").length} pending overtime
                      requests that need your approval
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900/20"
                    onClick={() => setActiveTab("pending")}
                  >
                    Review All
                  </Button>
                  <Button
                    className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                    onClick={handleBatchApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? "Processing..." : "Batch Approve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Overtime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.pendingOvertime}</div>
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
                  <span>Requests</span>
                  <span>{stats.pendingOvertimePercent}%</span>
                </div>
                <Progress value={stats.pendingOvertimePercent} className="h-1.5 bg-slate-100 dark:bg-slate-700" />
                <div className="flex justify-between text-xs mt-2">
                  <span>Total Hours Pending</span>
                  <span className="font-medium">{stats.pendingHours.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Overtime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.approvedOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approved
                </Badge>
              </div>
              <div className="mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-xs font-medium">Total Hours Approved</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.approvedHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Overtime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.rejectedOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Rejected
                </Badge>
              </div>
              <div className="mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-medium">Total Hours Rejected</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.rejectedHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Overtime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.totalOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  All Time
                </Badge>
              </div>
              <div className="mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-xs font-medium">Total Hours Requested</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Approval Rate</span>
                    <span>
                      {stats.totalOvertime ? Math.round((stats.approvedOvertime / stats.totalOvertime) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, department, ID..."
                className="pl-10 border-slate-300 dark:border-slate-700 focus-visible:ring-cyan-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 px-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />

              <Select
                value={timeFilter}
                onValueChange={(value) => {
                  setTimeFilter(value)
                  // Clear date range when selecting a predefined time filter
                  if (value !== "all") {
                    setDateRange({ start: null, end: null })
                  }
                }}
              >
                <SelectTrigger className="w-[140px] border-slate-300 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
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
                  <DropdownMenuLabel>Export Overtime Reports</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadAsPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadAsExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Download as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Sort</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortOption} onValueChange={setSortOption}>
                    <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("all")}>All Requests</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("pending")}>Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("approved")}>Approved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("rejected")}>Rejected</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Department</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by department</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDepartmentFilter("all")}>
                    All Departments
                    {departmentFilter === "all" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  {departments.map((dept) => (
                    <DropdownMenuItem key={dept} onClick={() => setDepartmentFilter(dept)}>
                      {dept}
                      {departmentFilter === dept && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Display date range information when a filter is active */}
          {((timeFilter !== "all" && dateRange.start === null) || (dateRange.start && dateRange.end)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-3 bg-cyan-50 border border-cyan-100 rounded-md flex items-center dark:bg-cyan-900/10 dark:border-cyan-800/30"
            >
              <Calendar className="h-5 w-5 text-cyan-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                {dateRange.start && dateRange.end ? (
                  <>
                    Showing overtime requests from{" "}
                    <span className="font-medium">{format(dateRange.start, "MMMM d, yyyy")}</span> to{" "}
                    <span className="font-medium">{format(dateRange.end, "MMMM d, yyyy")}</span>
                  </>
                ) : timeFilter !== "all" ? (
                  <>
                    Showing overtime requests for{" "}
                    <span className="font-medium">
                      {timeFilter === "week" ? "this week" : timeFilter === "month" ? "this month" : "this year"}
                    </span>
                  </>
                ) : null}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-800/30"
                onClick={() => {
                  setTimeFilter("all")
                  setDateRange({ start: null, end: null })
                }}
              >
                Clear
              </Button>
            </motion.div>
          )}
        </motion.div>

        <Tabs defaultValue="all" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="mb-6 grid grid-cols-4 w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger
              value="all"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400"
            >
              All Requests
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400"
            >
              Approved
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400"
            >
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <OvertimeRequestsList
              forms={filteredForms}
              isLoading={isLoading}
              onApprove={handleApproveForm}
              onReject={handleRejectForm}
              isApproving={isApproving}
              isRejecting={isRejecting}
            />
          </TabsContent>

          <TabsContent value="pending">
            <OvertimeRequestsList
              forms={filteredForms}
              isLoading={isLoading}
              onApprove={handleApproveForm}
              onReject={handleRejectForm}
              isApproving={isApproving}
              isRejecting={isRejecting}
            />
          </TabsContent>

          <TabsContent value="approved">
            <OvertimeRequestsList
              forms={filteredForms}
              isLoading={isLoading}
              onApprove={handleApproveForm}
              onReject={handleRejectForm}
              isApproving={isApproving}
              isRejecting={isRejecting}
            />
          </TabsContent>

          <TabsContent value="rejected">
            <OvertimeRequestsList
              forms={filteredForms}
              isLoading={isLoading}
              onApprove={handleApproveForm}
              onReject={handleRejectForm}
              isApproving={isApproving}
              isRejecting={isRejecting}
            />
          </TabsContent>
        </Tabs>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {forms.length} of {pagination.total} results
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
      </main>
    </div>
  )
}

function OvertimeRequestsList({
  forms,
  isLoading,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  forms: Form[]
  isLoading: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isApproving: boolean
  isRejecting: boolean
}) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center p-12 border rounded-lg bg-white dark:bg-slate-800 shadow-sm"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-4 mb-4">
            <Clock3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No overtime requests found</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            There are no overtime requests matching your current filters. Try changing your search criteria.
          </p>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <Filter className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {forms.map((form) => (
                <motion.tr key={form.id} variants={item} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{form.employee.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{form.employee.employeeId}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm">{form.employee.department}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{form.employee.position}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm">{new Date(form.data.date).toLocaleDateString()}</div>
                    {form.data.startTime && form.data.endTime && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {form.data.startTime} - {form.data.endTime}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded text-xs font-medium inline-block">
                      {form.data.hours}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm max-w-xs line-clamp-2">{form.data.reason}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <FormStatusBadge status={form.status} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/form/${form.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-medium flex items-center transition-all text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
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
                                  className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-900/20"
                                  onClick={() => onApprove(form.id)}
                                  disabled={isApproving}
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
                                  onClick={() => onReject(form.id)}
                                  disabled={isRejecting}
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
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
