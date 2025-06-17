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
  Users,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  SlidersHorizontal,
  Eye,
  FileDown,
  CalendarIcon,
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
import { Progress } from "@/components/ui/progress"
import {
  format,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Form {
  id: string
  type: string
  status: string
  createdAt: string
  data: any
  employee?: {
    id: string
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

function LeaveRequestCard({ form }: { form: Form }) {
  return (
    <Card className="h-full hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px] border-l-4 border-l-teal-500 dark:border-l-teal-400 overflow-hidden group relative bg-white/80 backdrop-blur-sm dark:bg-slate-800/90">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-teal-500/5 to-teal-500/0 group-hover:from-teal-500/10 group-hover:to-teal-500/5 transition-all duration-300"></div>
      <CardHeader className="pb-2 relative">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-500" />
              Leave Request
            </CardTitle>
            <CardDescription>Submitted on {new Date(form.createdAt).toLocaleDateString()}</CardDescription>
          </div>
          <FormStatusBadge status={form.status} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Employees:</span>{" "}
            {form.data.employees && form.data.employees.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {form.data.employees.map((emp: any, index: number) => (
                  <span
                    key={index}
                    className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded text-xs font-medium"
                  >
                    {emp.name || "Unknown"}
                  </span>
                ))}
              </div>
            ) : (
              <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded text-xs font-medium">
                0
              </span>
            )}
          </div>
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
            <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded text-xs font-medium">
              {form.data.totalDays}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 relative flex justify-between">
        <Link href={`/dashboard/form/${form.id}`} className="block z-10">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center group-hover:gap-2 transition-all hover:bg-teal-50 dark:hover:bg-teal-900/20 relative z-10"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View details
            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        {form.status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium flex items-center gap-1 border-teal-200 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/20 relative z-10"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Review
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function OvertimeRequestCard({ form }: { form: Form }) {
  return (
    <Card className="h-full hover:shadow-xl transition-all duration-300 hover:translate-y-[-3px] border-l-4 border-l-cyan-500 dark:border-l-cyan-400 overflow-hidden group relative bg-white/80 backdrop-blur-sm dark:bg-slate-800/90">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-cyan-500/5 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:to-cyan-500/5 transition-all duration-300"></div>
      <CardHeader className="pb-2 relative">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-cyan-500" />
              Overtime Request
            </CardTitle>
            <CardDescription>Submitted on {new Date(form.createdAt).toLocaleDateString()}</CardDescription>
          </div>
          <FormStatusBadge status={form.status} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Employees:</span>{" "}
            {form.data.employees && form.data.employees.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {form.data.employees.map((emp: any, index: number) => (
                  <span
                    key={index}
                    className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded text-xs font-medium"
                  >
                    {emp.name || "Unknown"}
                  </span>
                ))}
              </div>
            ) : (
              <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded text-xs font-medium">
                0
              </span>
            )}
          </div>
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
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium flex items-center gap-1 border-cyan-200 text-cyan-600 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-400 dark:hover:bg-cyan-900/20 relative z-10"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Review
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function LeaderDashboard({ user }: { user: any }) {
  const [forms, setForms] = useState<Form[]>([])
  const [filteredForms, setFilteredForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sortOption, setSortOption] = useState("newest")
  const router = useRouter()

  // Pagination state
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const [timeFilter, setTimeFilter] = useState("all")
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })

  const filterFormsByTimeRange = (forms: Form[]) => {
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

    setDateRange({ start, end })

    return forms.filter((form) => {
      const formDate = new Date(form.createdAt)
      return isWithinInterval(formDate, { start, end })
    })
  }

  const downloadAsPDF = () => {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(18)
    doc.text("Leave Forms Report", 14, 22)

    // Add date range if applicable
    if (dateRange.start && dateRange.end) {
      doc.setFontSize(12)
      doc.text(`Period: ${format(dateRange.start, "dd/MM/yyyy")} - ${format(dateRange.end, "dd/MM/yyyy")}`, 14, 30)
    }

    // Add table headers
    doc.setFontSize(10)
    doc.text("Type", 14, 40)
    doc.text("Employee", 50, 40)
    doc.text("Status", 100, 40)
    doc.text("Date", 130, 40)
    doc.text("Days", 170, 40)

    // Add table content
    let y = 50
    const formsToExport = filterFormsByTimeRange(forms.filter((form) => form.type === "leave"))

    formsToExport.forEach((form, index) => {
      const employeeName = form.data.employees && form.data.employees.length > 0 ? form.data.employees[0].name : "N/A"

      doc.text(form.type, 14, y)
      doc.text(employeeName, 50, y)
      doc.text(form.status, 100, y)
      doc.text(new Date(form.createdAt).toLocaleDateString(), 130, y)
      doc.text(form.data.totalDays || "N/A", 170, y)

      y += 10

      // Add new page if needed
      if (y > 280) {
        doc.addPage()
        y = 20
      }
    })

    // Save the PDF
    doc.save(`leave-forms-${timeFilter}.pdf`)
  }

  const downloadAsExcel = () => {
    const formsToExport = filterFormsByTimeRange(forms.filter((form) => form.type === "leave"))

    // Prepare data for Excel
    const data = formsToExport.map((form) => {
      const employeeName = form.data.employees && form.data.employees.length > 0 ? form.data.employees[0].name : "N/A"

      return {
        Type: form.type,
        Employee: employeeName,
        Status: form.status,
        "Submission Date": new Date(form.createdAt).toLocaleDateString(),
        "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
        "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
        "Total Days": form.data.totalDays || "N/A",
        Reason: form.data.reason || "N/A",
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data)

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Leave Forms")

    // Generate Excel file
    XLSX.writeFile(wb, `leave-forms-${timeFilter}.xlsx`)
  }

  const fetchForms = async (page = 1, status = activeTab) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", pagination.limit.toString())

      if (status !== "all") {
        params.append("status", status)
      }

      const response = await fetch(`/api/forms?${params.toString()}`)
      const result = await response.json()

      // Extract the forms array from the data property
      setForms(result.data || [])
      setFilteredForms(result.data || [])

      // Update pagination state
      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error("Error fetching forms:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchForms(1, activeTab)
  }, [activeTab])

  useEffect(() => {
    // Filter forms based on search query and time filter
    let result = forms

    // Apply time filter
    result = filterFormsByTimeRange(result)

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((form) => {
        // Search in form type
        if (form.type.toLowerCase().includes(query)) return true

        // Search in employee names
        if (
          form.data.employees &&
          form.data.employees.some((emp: any) => emp.name && emp.name.toLowerCase().includes(query))
        )
          return true

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
  }, [searchQuery, forms, sortOption, timeFilter])

  const handleCreateForm = (type: string) => {
    if (type === "leave") {
      router.push("/dashboard/leave-form")
    } else if (type === "overtime") {
      router.push("/dashboard/overtime-form")
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Reset to page 1 when changing tabs
    fetchForms(1, value)
  }

  const handlePageChange = (newPage: number) => {
    fetchForms(newPage, activeTab)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalLeave = forms.filter((form) => form.type === "leave").length
    const totalOvertime = forms.filter((form) => form.type === "overtime").length
    const pendingLeave = forms.filter((form) => form.type === "leave" && form.status === "pending").length
    const pendingOvertime = forms.filter((form) => form.type === "overtime" && form.status === "pending").length
    const approvedLeave = forms.filter((form) => form.type === "leave" && form.status === "approved").length
    const approvedOvertime = forms.filter((form) => form.type === "overtime" && form.status === "approved").length
    const rejectedLeave = forms.filter((form) => form.type === "leave" && form.status === "rejected").length
    const rejectedOvertime = forms.filter((form) => form.type === "overtime" && form.status === "rejected").length

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
    }
  }, [forms])

  return (
    <div className="min-h-screen bg-teal-50/50 dark:bg-slate-900">
      <DashboardHeader user={user} />

      <main className="container mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Leader Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Manage your team's leave and overtime requests</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              className="gap-2 border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-teal-800 dark:hover:bg-teal-900 dark:hover:text-teal-300"
              onClick={() => handleCreateForm("leave")}
            >
              <Calendar className="h-4 w-4" />
              New Leave
            </Button>
            <Button
              variant="default"
              className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              onClick={() => handleCreateForm("overtime")}
            >
              <Clock className="h-4 w-4" />
              New Overtime
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent className="relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/40 dark:from-teal-900/10 dark:to-cyan-900/10 z-0"></div>
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
            <CardContent className="relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/40 dark:from-teal-900/10 dark:to-cyan-900/10 z-0"></div>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.approvedLeave + stats.approvedOvertime}</div>
                <Badge
                  variant="outline"
                  className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approved
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-500" />
                    <span className="text-xs font-medium">Leave</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.approvedLeave}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-teal-500" />
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
            <CardContent className="relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/40 dark:from-teal-900/10 dark:to-cyan-900/10 z-0"></div>
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
                    <Calendar className="h-3.5 w-3.5 text-teal-500" />
                    <span className="text-xs font-medium">Leave</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.rejectedLeave}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-teal-500" />
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
            <CardContent className="relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/40 dark:from-teal-900/10 dark:to-cyan-900/10 z-0"></div>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{pagination.total || forms.length}</div>
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
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-300">
                        Leave
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-teal-600 dark:text-teal-300">
                        {forms.length > 0 ? Math.round((stats.totalLeave / forms.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-teal-100 dark:bg-teal-900/20">
                    <div
                      style={{
                        width: `${forms.length > 0 ? Math.round((stats.totalLeave / forms.length) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500"
                    ></div>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-300">
                        Overtime
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-cyan-600 dark:text-cyan-300">
                        {forms.length > 0 ? Math.round((stats.totalOvertime / forms.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-cyan-100 dark:bg-cyan-900/20">
                    <div
                      style={{
                        width: `${forms.length > 0 ? Math.round((stats.totalOvertime / forms.length) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500"
                    ></div>
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
                placeholder="Search by name, reason or type..."
                className="pl-10 border-slate-300 dark:border-slate-700 focus-visible:ring-teal-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
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
                  <DropdownMenuLabel>Export Leave Forms</DropdownMenuLabel>
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
                  <DropdownMenuItem onClick={() => setActiveTab("all")}>All Forms</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("pending")}>Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("approved")}>Approved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("rejected")}>Rejected</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Display date range information when a time filter is active */}
          {timeFilter !== "all" && dateRange.start && dateRange.end && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-md flex items-center dark:bg-teal-900/10 dark:border-teal-800/30"
            >
              <Calendar className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-teal-700 dark:text-teal-300">
                Showing forms from <span className="font-medium">{format(dateRange.start, "MMMM d, yyyy")}</span> to{" "}
                <span className="font-medium">{format(dateRange.end, "MMMM d, yyyy")}</span>
              </p>
            </motion.div>
          )}
        </motion.div>

        <Tabs defaultValue="all" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="mb-6 grid grid-cols-4 w-full max-w-md mx-auto bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger
              value="all"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400"
            >
              All Forms
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400"
            >
              Pending
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400"
            >
              Approved
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400"
            >
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="pending">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="approved">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="rejected">
            <CombinedFormsList forms={filteredForms} isLoading={isLoading} />
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

function CombinedFormsList({ forms, isLoading }: { forms: Form[]; isLoading: boolean }) {
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
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Employee
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
                <motion.tr key={form.id} variants={item} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-4 whitespace-nowrap">
                    {form.type === "leave" ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Leave</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                          <Clock3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Overtime</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {form.data.employees && form.data.employees.length > 0 ? (
                        form.data.employees.map((emp: any, index: number) => (
                          <span
                            key={index}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              form.type === "leave"
                                ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                                : "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                            }`}
                          >
                            {emp.name || "Unknown"}
                          </span>
                        ))
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            form.type === "leave"
                              ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                              : "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                          }`}
                        >
                          {form.employee?.name || "No employees"}
                        </span>
                      )}
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
                          <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded text-xs font-medium">
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
                          <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded text-xs font-medium">
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
                          className={`text-xs font-medium flex items-center transition-all ${
                            form.type === "leave"
                              ? "text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                              : "text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                          }`}
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
                                  className={`h-8 w-8 ${
                                    form.type === "leave"
                                      ? "text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:text-teal-300 dark:hover:bg-teal-900/20"
                                      : "text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-900/20"
                                  }`}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
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
                                  <XCircle className="h-4 w-4" />
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