"use client"

import React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  Loader2,
  Users,
  GraduationCap,
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

// ✅ Enhanced interfaces with better typing
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
  formNumber?: number
}

interface Employee {
  name: string
  employeeId: string
  employeeCode?: string
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

interface DashboardFilters {
  activeTab: string
  timeFilter: string
  selectedMonth: { month: number; year: number } | null
  departmentFilter: string
  requestTypeFilter: "all" | "leave" | "overtime"
  sortOption: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

interface ApiResponse {
  data?: Form[]
  pagination?: PaginationData
}

interface StatsApiResponse {
  data?: Form[]
}

const normalizeStatus = (status?: string | null) => (status ?? "").toUpperCase()

const formatFormId = (form: Form): string => {
  if (form.formNumber) {
    const numericId = Number(form.formNumber)
    if (!isNaN(numericId)) {
      return numericId.toString().padStart(4, "0")
    }
  }
  return "0001"
}

const getEmployeeId = (form: Form, employee: Employee): string => {
  if (form.type === "leave") {
    return employee.employeeCode || (employee as any).employeeId || "-"
  } else {
    return employee.employeeCode || employee.employeeId || "-"
  }
}

// ✅ Simple in-memory cache for API responses
class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly ttl = 60000 // 1 minute TTL

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  generateKey(filters: Partial<DashboardFilters>, page?: number): string {
    const keyParts = [
      `tab:${filters.activeTab || "all"}`,
      `time:${filters.timeFilter || "all"}`,
      `month:${filters.selectedMonth ? `${filters.selectedMonth.month}-${filters.selectedMonth.year}` : "none"}`,
      `dept:${filters.departmentFilter || "all"}`,
      `type:${filters.requestTypeFilter || "all"}`,
      `sort:${filters.sortOption || "newest"}`,
      page ? `page:${page}` : "",
    ].filter(Boolean)

    return keyParts.join("|")
  }
}

// ✅ Global cache instance
const dashboardCache = new DashboardCache()

// ✅ Debounce hook for filter changes
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ✅ Memoized MonthYearPicker component
const MonthYearPicker = React.memo(function MonthYearPicker({
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

  const months = useMemo(
    () => [
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
    ],
    [],
  )

  const years = useMemo(() => Array.from({ length: 10 }, (_, i) => viewingYear - 5 + i), [viewingYear])

  const handleSelectMonth = useCallback(
    (month: number) => {
      setSelectedMonth({ month, year: tempYear })
      setIsOpen(false)
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [tempYear, setSelectedMonth, setPagination],
  )

  const clearSelection = useCallback(() => {
    setSelectedMonth(null)
    setIsOpen(false)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [setSelectedMonth, setPagination])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[200px] justify-start text-left font-normal border-slate-300 dark:border-slate-700 bg-transparent"
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
})

// ✅ Memoized form card components
const LeaveRequestCard = React.memo(function LeaveRequestCard({
  form,
  deleteForm,
  handleViewForm,
  viewingFormId,
  onApprove,
}: {
  form: Form
  deleteForm: (id: string) => void
  handleViewForm: (id: string) => void
  viewingFormId: string | null
  onApprove: (id: string) => void
}) {
  const handleDelete = useCallback(() => {
    deleteForm(form.id)
  }, [form.id, deleteForm])

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
                {form.data?.employees && form.data.employees.length > 0 ? (
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
              <div className="mt-1">{form.data?.employees?.[0]?.department || form.employee.department}</div>
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
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center"
          onClick={() => handleViewForm(form.id)}
          disabled={viewingFormId === form.id}
        >
          {viewingFormId === form.id ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 mr-1" />
              View details
              <ArrowRight className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
        <div className="flex gap-1">
          {normalizeStatus(form.status) === "PENDING" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onApprove(form.id)}
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
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50
                         dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
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
      </CardFooter>
    </Card>
  )
})

const OvertimeRequestCard = React.memo(function OvertimeRequestCard({
  form,
  deleteForm,
  handleViewForm,
  viewingFormId,
  onApprove,
}: {
  form: Form
  deleteForm: (formId: string) => void
  handleViewForm: (formId: string) => void
  viewingFormId: string | null
  onApprove: (id: string) => void
}) {
  const handleDelete = useCallback(() => {
    deleteForm(form.id)
  }, [form.id, deleteForm])

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
                {form.data?.employees && form.data.employees.length > 0 ? (
                  form.data.employees.map((emp: Employee, index: number) => (
                    <span key={getEmployeeId(form, emp) || index}>
                      {index > 0 && <span className="mx-1">•</span>}
                      {emp.name} <span className="text-slate-400">({getEmployeeId(form, emp)})</span>
                    </span>
                  ))
                ) : (
                  <span>
                    {form.employee.name} <span className="text-slate-400">({getEmployeeId(form, form.employee)})</span>
                  </span>
                )}
              </div>
              <div className="mt-1">{form.data?.employees?.[0]?.department || form.employee.department}</div>
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
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center"
          onClick={() => handleViewForm(form.id)}
          disabled={viewingFormId === form.id}
        >
          {viewingFormId === form.id ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 mr-1" />
              View details
              <ArrowRight className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
        <div className="flex gap-1">
          {normalizeStatus(form.status) === "PENDING" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onApprove(form.id)}
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

          {/* ⬇️ INI JSX BIASA, DI LUAR CONDITIONAL */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
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
})

export default function OptimizedHRDDashboard({ user }: { user: any }) {
  // ✅ SINGLE SOURCE OF TRUTH
  const [forms, setForms] = useState<Form[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // ✅ FILTER STATE
  const [filters, setFilters] = useState<DashboardFilters>({
    activeTab: "all",
    timeFilter: "all",
    selectedMonth: null,
    departmentFilter: "all",
    requestTypeFilter: "all",
    sortOption: "newest",
  })

  // ✅ PAGINATION STATE
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // ✅ DERIVED DATA (NO useState, NO useEffect)
  const filteredForms = useMemo(() => {
    if (!Array.isArray(forms)) return []

    return forms.filter((form) => {
      const status = normalizeStatus(form.status)

      if (filters.activeTab === "pending") return status === "PENDING"
      if (filters.activeTab === "approved") return status === "APPROVED"
      if (filters.activeTab === "rejected") return status === "REJECTED"

      return true // "all"
    })
  }, [forms, filters.activeTab])

  const debouncedFilters = useDebounce(filters, 300)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [formToDelete, setFormToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [viewingFormId, setViewingFormId] = useState<string | null>(null)
  const router = useRouter()

  // ✅ Helper function for time filter dates
  const getTimeFilterDates = useCallback((filter: string) => {
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
  }, [])

  // ✅ Memoized departments calculation
  const departments = useMemo(() => {
    const depts = new Set<string>()
    if (Array.isArray(forms)) {
      forms.forEach((form) => {
        if (form.employee?.department) {
          depts.add(form.employee.department)
        }
      })
    }
    return Array.from(depts)
  }, [forms])

  // ✅ Added job requisition and training request statistics to match leader dashboard
  const stats = useMemo(() => {
    const formsArray = Array.isArray(forms) ? forms : []

    const totalLeave = formsArray.filter((form) => form.type === "leave").length
    const totalOvertime = formsArray.filter((form) => form.type === "overtime").length
    const totalJobRequisition = formsArray.filter((form) => form.type === "job-requisition").length
    const totalTrainingRequest = formsArray.filter((form) => form.type === "training-request").length
    const pendingLeave = formsArray.filter(
      (form) => form.type === "leave" && normalizeStatus(form.status) === "PENDING",
    ).length
    const pendingOvertime = formsArray.filter(
      (form) => form.type === "overtime" && normalizeStatus(form.status) === "PENDING",
    ).length
    const pendingJobRequisition = formsArray.filter(
      (form) => form.type === "job-requisition" && normalizeStatus(form.status) === "PENDING",
    ).length
    const pendingTrainingRequest = formsArray.filter(
      (form) => form.type === "training-request" && normalizeStatus(form.status) === "PENDING",
    ).length
    const approvedLeave = formsArray.filter(
      (form) => form.type === "leave" && normalizeStatus(form.status) === "APPROVED",
    ).length
    const approvedOvertime = formsArray.filter(
      (form) => form.type === "overtime" && normalizeStatus(form.status) === "APPROVED",
    ).length
    const approvedJobRequisition = formsArray.filter(
      (form) => form.type === "job-requisition" && normalizeStatus(form.status) === "APPROVED",
    ).length
    const approvedTrainingRequest = formsArray.filter(
      (form) => form.type === "training-request" && normalizeStatus(form.status) === "APPROVED",
    ).length
    const rejectedLeave = formsArray.filter(
      (form) => form.type === "leave" && normalizeStatus(form.status) === "REJECTED",
    ).length
    const rejectedOvertime = formsArray.filter(
      (form) => form.type === "overtime" && normalizeStatus(form.status) === "REJECTED",
    ).length
    const rejectedJobRequisition = formsArray.filter(
      (form) => form.type === "job-requisition" && normalizeStatus(form.status) === "REJECTED",
    ).length
    const rejectedTrainingRequest = formsArray.filter(
      (form) => form.type === "training-request" && normalizeStatus(form.status) === "REJECTED",
    ).length

    return {
      totalLeave,
      totalOvertime,
      totalJobRequisition,
      totalTrainingRequest,
      pendingLeave,
      pendingOvertime,
      pendingJobRequisition,
      pendingTrainingRequest,
      approvedLeave,
      approvedOvertime,
      approvedJobRequisition,
      approvedTrainingRequest,
      rejectedLeave,
      rejectedOvertime,
      rejectedJobRequisition,
      rejectedTrainingRequest,
      pendingLeavePercent: totalLeave ? Math.round((pendingLeave / totalLeave) * 100) : 0,
      pendingOvertimePercent: totalOvertime ? Math.round((pendingOvertime / totalOvertime) * 100) : 0,
      totalRequests: totalLeave + totalOvertime + totalJobRequisition + totalTrainingRequest,
    }
  }, [forms])

  // ✅ FIXED: Improved fetchForms function with better error handling
  const fetchForms = useCallback(
    async (page = 1, currentFilters = debouncedFilters) => {
      const cacheKey = `forms:${dashboardCache.generateKey(currentFilters, page)}`
      const cachedData = dashboardCache.get<{ forms: Form[]; pagination: PaginationData }>(cacheKey)

      if (cachedData) {
        console.log("✅ Using cached data for:", cacheKey)
        setForms(Array.isArray(cachedData.forms) ? cachedData.forms : [])
        if (cachedData.pagination) {
          setPagination(cachedData.pagination)
        }
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // ✅ Build API URL with proper parameters
        const params = new URLSearchParams()
        params.append("page", page.toString())
        params.append("limit", pagination.limit.toString())

        if (currentFilters.selectedMonth) {
          const startDate = new Date(currentFilters.selectedMonth.year, currentFilters.selectedMonth.month, 1)
          const endDate = new Date(currentFilters.selectedMonth.year, currentFilters.selectedMonth.month + 1, 0)
          params.append("startDate", startDate.toISOString())
          params.append("endDate", endDate.toISOString())
        } else if (currentFilters.timeFilter !== "all") {
          const { start, end } = getTimeFilterDates(currentFilters.timeFilter)
          params.append("startDate", start.toISOString())
          params.append("endDate", end.toISOString())
        }

        if (currentFilters.requestTypeFilter !== "all") {
          params.append("type", currentFilters.requestTypeFilter)
        }

        if (currentFilters.departmentFilter !== "all") {
          params.append("department", currentFilters.departmentFilter)
        }

        console.log("🔄 Fetching forms with params:", params.toString())

        const response = await fetch(`/api/forms?${params.toString()}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log("📥 API Response:", result)

        // ✅ FIXED: Better response handling
        const formsData = result?.data
          ? Array.isArray(result.data)
            ? result.data
            : []
          : Array.isArray(result)
            ? result
            : []

        const paginationData = result?.pagination || {
          total: formsData.length,
          page: page,
          limit: pagination.limit,
          totalPages: Math.ceil(formsData.length / pagination.limit),
          hasNextPage: false,
          hasPrevPage: false,
        }

        const responseData = {
          forms: formsData,
          pagination: paginationData,
        }

        // ✅ Cache the response
        dashboardCache.set(cacheKey, responseData)

        setForms(formsData)
        setPagination(paginationData)

        console.log("✅ Fetched and cached data for:", cacheKey)
        console.log("📊 Pagination data:", paginationData)
      } catch (error) {
        console.error("❌ Error fetching forms:", error)
        setForms([])
        // ✅ Reset pagination on error
        setPagination({
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        })
      } finally {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [debouncedFilters, pagination.limit, getTimeFilterDates],
  )

  const handleApprove = useCallback(
  async (formId: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: "HRD",
          comments: "",
        }),
      })

      if (!res.ok) {
        throw new Error("Approve failed")
      }

      const result = await res.json()
      dashboardCache.clear()
await fetchForms(pagination.page)


      // 🔥 SATU-SATUNYA SOURCE OF TRUTH SETELAH APPROVE
      setForms((prev) =>
        prev.map((f) =>
          f.id === formId
            ? {
                ...f,
                ...result.form,
              }
            : f
        )
      )

      // optional: clear FE cache biar fetch selanjutnya bersih
      dashboardCache.clear()

      // ❌ JANGAN FETCH ULANG DI SINI
      // ❌ JANGAN fetchForms(...)
    } catch (err) {
      console.error("Approve error:", err)
      alert("Failed to approve form")
    }
  },
  [] // 🔥 fetchForms & pagination TIDAK DIBUTUHKAN
)

  // ✅ Memoized filter update functions
  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [])

  const handleTabChange = useCallback(
    (value: string) => {
      updateFilters({ activeTab: value })
    },
    [updateFilters],
  )

  // ✅ FIXED: Improved handlePageChange function
  const handlePageChange = useCallback(
    (newPage: number) => {
      console.log("🔄 Page change requested:", newPage)
      console.log("📊 Current pagination:", pagination)

      // ✅ Validate page number
      if (newPage < 1 || newPage > pagination.totalPages) {
        console.warn("⚠️ Invalid page number:", newPage)
        return
      }

      // ✅ Update pagination state first
      setPagination((prev) => ({
        ...prev,
        page: newPage,
      }))

      // ✅ Fetch data for the new page
      fetchForms(newPage, debouncedFilters) // Force refresh for page changes
    },
    [fetchForms, debouncedFilters, pagination],
  )

  // ✅ Memoized delete functions
  const handleDeleteClick = useCallback((formId: string) => {
    setFormToDelete(formId)
    setShowDeleteDialog(true)
  }, [])

  const handleViewForm = useCallback(
    async (formId: string) => {
      setViewingFormId(formId)

      // Show loading for a brief moment to provide user feedback
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Navigate to form details
      router.push(`/dashboard/form/${formId}`)
    },
    [router],
  )

  const confirmDelete = useCallback(async () => {
    if (!formToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/forms/${formToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // ✅ Clear cache and refetch data
        dashboardCache.clear()

        setForms((prevForms: Form[]) => prevForms.filter((form) => form.id !== formToDelete))

        setPagination((prev) => ({
          ...prev,
          total: prev.total - 1,
        }))

        setShowDeleteDialog(false)
        setFormToDelete(null)

        // Refetch data to ensure consistency
        fetchForms(pagination.page, debouncedFilters)
      } else {
        throw new Error("Failed to delete form")
      }
    } catch (error) {
      console.error("Error deleting form:", error)
      alert("Failed to delete form. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }, [formToDelete, pagination.page, debouncedFilters, fetchForms])

  const cancelDelete = useCallback(() => {
    setShowDeleteDialog(false)
    setFormToDelete(null)
  }, [])

  // ✅ Export functions with better URL building
  const buildExportUrl = useCallback(
    (format: string, type?: string) => {
      const params = new URLSearchParams()
      params.append("format", format)
      params.append("getAllForms", "true")

      if (type) {
        params.append("type", type)
      }

      if (debouncedFilters.selectedMonth) {
        params.append("selectedMonth", JSON.stringify(debouncedFilters.selectedMonth))
      } else if (debouncedFilters.timeFilter !== "all") {
        params.append("timeFilter", debouncedFilters.timeFilter)
      }

      if (debouncedFilters.requestTypeFilter !== "all" && !type) {
        params.append("type", debouncedFilters.requestTypeFilter)
      }

      if (debouncedFilters.departmentFilter !== "all") {
        params.append("department", debouncedFilters.departmentFilter)
      }

      return `/api/forms?${params.toString()}`
    },
    [debouncedFilters],
  )

  const downloadAsExcel = useCallback(() => {
    window.location.href = buildExportUrl("excel")
  }, [buildExportUrl])

  const downloadAsPDF = useCallback(() => {
    window.location.href = buildExportUrl("pdf")
  }, [buildExportUrl])

  const downloadLeaveFormsAsExcel = useCallback(() => {
    window.location.href = buildExportUrl("excel", "leave")
  }, [buildExportUrl])

  const downloadOvertimeFormsAsExcel = useCallback(() => {
    window.location.href = buildExportUrl("excel", "overtime")
  }, [buildExportUrl])

  const downloadLeaveFormsAsPDF = useCallback(() => {
    window.location.href = buildExportUrl("pdf", "leave")
  }, [buildExportUrl])

  const downloadOvertimeFormsAsPDF = useCallback(() => {
    window.location.href = buildExportUrl("pdf", "overtime")
  }, [buildExportUrl])

  // ✅ FIXED: Effects with proper dependencies
  useEffect(() => {
  fetchForms(pagination.page, debouncedFilters)
}, [
  debouncedFilters.activeTab,
  debouncedFilters.timeFilter,
  debouncedFilters.selectedMonth,
  debouncedFilters.departmentFilter,
  debouncedFilters.requestTypeFilter,
])
  
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

        {/* ✅ Stats Overview with memoized data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {stats.pendingLeave +
                    stats.pendingOvertime +
                    stats.pendingJobRequisition +
                    stats.pendingTrainingRequest}
                </div>
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
                <div className="flex justify-between text-xs">
                  <span>Job Req ({stats.pendingJobRequisition})</span>
                  <span>
                    {stats.totalJobRequisition
                      ? Math.round((stats.pendingJobRequisition / stats.totalJobRequisition) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    stats.totalJobRequisition
                      ? Math.round((stats.pendingJobRequisition / stats.totalJobRequisition) * 100)
                      : 0
                  }
                  className="h-1.5 bg-slate-100 dark:bg-slate-700"
                />
                <div className="flex justify-between text-xs">
                  <span>Training ({stats.pendingTrainingRequest})</span>
                  <span>
                    {stats.totalTrainingRequest
                      ? Math.round((stats.pendingTrainingRequest / stats.totalTrainingRequest) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    stats.totalTrainingRequest
                      ? Math.round((stats.pendingTrainingRequest / stats.totalTrainingRequest) * 100)
                      : 0
                  }
                  className="h-1.5 bg-slate-100 dark:bg-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {stats.approvedLeave +
                    stats.approvedOvertime +
                    stats.approvedJobRequisition +
                    stats.approvedTrainingRequest}
                </div>
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
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Job Req</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.approvedJobRequisition}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Training</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.approvedTrainingRequest}</p>
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
                <div className="text-2xl font-bold">
                  {stats.rejectedLeave +
                    stats.rejectedOvertime +
                    stats.rejectedJobRequisition +
                    stats.rejectedTrainingRequest}
                </div>
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
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Job Req</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.rejectedJobRequisition}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium">Training</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.rejectedTrainingRequest}</p>
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
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
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
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
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
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                    <div
                      style={{
                        width: `${stats.totalRequests ? Math.round((stats.totalOvertime / stats.totalRequests) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-500"
                    ></div>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Job Req
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-slate-600 dark:text-slate-300">
                        {stats.totalRequests ? Math.round((stats.totalJobRequisition / stats.totalRequests) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                    <div
                      style={{
                        width: `${stats.totalRequests ? Math.round((stats.totalJobRequisition / stats.totalRequests) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-500"
                    ></div>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Training
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-slate-600 dark:text-slate-300">
                        {stats.totalRequests ? Math.round((stats.totalTrainingRequest / stats.totalRequests) * 100) : 0}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-100 dark:bg-slate-700">
                    <div
                      style={{
                        width: `${stats.totalRequests ? Math.round((stats.totalTrainingRequest / stats.totalRequests) * 100) : 0}%`,
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-500"
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters section with memoized components */}
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
                selectedMonth={filters.selectedMonth}
                setSelectedMonth={(value) => updateFilters({ selectedMonth: value })}
                setPagination={setPagination}
              />

              <Select
                value={filters.timeFilter}
                onValueChange={(value) =>
                  updateFilters({
                    timeFilter: value,
                    selectedMonth: value !== "all" ? null : filters.selectedMonth,
                  })
                }
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
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700 bg-transparent">
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
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700 bg-transparent">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Request Type</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by request type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateFilters({ requestTypeFilter: "all" })}>
                    All Requests
                    {filters.requestTypeFilter === "all" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateFilters({ requestTypeFilter: "leave" })}>
                    Leave Requests
                    {filters.requestTypeFilter === "leave" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateFilters({ requestTypeFilter: "overtime" })}>
                    Overtime Requests
                    {filters.requestTypeFilter === "overtime" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(filters.timeFilter !== "all" || filters.selectedMonth) && (
            <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-md flex items-center dark:bg-slate-800 dark:border-slate-700">
              <Calendar className="h-5 w-5 text-slate-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {filters.selectedMonth ? (
                  <>
                    Showing forms for{" "}
                    <span className="font-medium">
                      {new Date(filters.selectedMonth.year, filters.selectedMonth.month).toLocaleString("default", {
                        month: "long",
                      })}{" "}
                      {filters.selectedMonth.year}
                    </span>
                  </>
                ) : filters.timeFilter !== "all" ? (
                  <>
                    Showing forms for{" "}
                    <span className="font-medium">
                      {filters.timeFilter === "week"
                        ? "this week"
                        : filters.timeFilter === "month"
                          ? "this month"
                          : "this year"}
                    </span>
                  </>
                ) : null}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={() => {
                  updateFilters({ timeFilter: "all", selectedMonth: null })
                  dashboardCache.clear()
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Tabs
  value={filters.activeTab}
  onValueChange={handleTabChange}
  className="w-full"
>
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
            <CombinedFormsList
              forms={filteredForms}
              isLoading={isLoading}
              deleteForm={handleDeleteClick}
              handleViewForm={handleViewForm}
              viewingFormId={viewingFormId}
              onApprove={handleApprove}
            />
          </TabsContent>

          <TabsContent value="pending">
            <CombinedFormsList
              forms={filteredForms}
              isLoading={isLoading}
              deleteForm={handleDeleteClick}
              handleViewForm={handleViewForm}
              viewingFormId={viewingFormId}
              onApprove={handleApprove}
            />
          </TabsContent>

          <TabsContent value="approved">
            <CombinedFormsList
              forms={filteredForms}
              isLoading={isLoading}
              deleteForm={handleDeleteClick}
              handleViewForm={handleViewForm}
              viewingFormId={viewingFormId}
              onApprove={handleApprove}
            />
          </TabsContent>

          <TabsContent value="rejected">
            <CombinedFormsList
              forms={filteredForms}
              isLoading={isLoading}
              deleteForm={handleDeleteClick}
              handleViewForm={handleViewForm}
              viewingFormId={viewingFormId}
              onApprove={handleApprove}
            />
          </TabsContent>
        </Tabs>

        {/* ✅ FIXED: Improved Pagination Controls with better debugging */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredForms.length} of {pagination.total} results
              {/* ✅ Debug info */}
              <span className="ml-2 text-xs opacity-60">
                (Page {pagination.page}/{pagination.totalPages})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log("⬅️ Previous button clicked")
                  handlePageChange(pagination.page - 1)
                }}
                disabled={!pagination.hasPrevPage || pagination.page <= 1}
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
                onClick={() => {
                  console.log("➡️ Next button clicked")
                  handlePageChange(pagination.page + 1)
                }}
                disabled={!pagination.hasNextPage || pagination.page >= pagination.totalPages}
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
                className="border-slate-200 dark:border-slate-700 bg-transparent"
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

// ✅ FIXED: Memoized CombinedFormsList component with better error handling
const CombinedFormsList = React.memo(function CombinedFormsList({
  forms,
  isLoading,
  deleteForm,
  handleViewForm,
  viewingFormId,
  onApprove,
}: {
  forms: Form[]
  isLoading: boolean
  deleteForm: (formId: string) => void
  handleViewForm: (formId: string) => void
  viewingFormId: string | null
  onApprove: (formId: string) => Promise<void>
}) {
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
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => window.location.reload()}>
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
                  Form ID
                </th>
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formatFormId(form)}
                  </td>
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
                    ) : form.type === "overtime" ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Clock3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Overtime</span>
                        </div>
                      </div>
                    ) : form.type === "job-requisition" ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Job Requisition</span>
                        </div>
                      </div>
                    ) : form.type === "training-request" ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <GraduationCap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Training Request</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="ml-3">
                          <span className="text-sm font-medium">Other</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {form.data?.employees && form.data.employees.length > 0 ? (
                        form.data.employees.map((emp: Employee, index: number) => (
                          <div key={`${getEmployeeId(form, emp)}-${index}`} className="text-sm">
                            <span className="font-medium">{emp.name}</span>{" "}
                            <span className="text-slate-500">({getEmployeeId(form, emp)})</span>
                            {index < (form.data?.employees?.length ?? 0) - 1 && <span className="ml-1 mr-1">•</span>}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm">
                          <span className="font-medium">{form.employee?.name || "-"}</span>{" "}
                          <span className="text-slate-500">({getEmployeeId(form, form.employee) || "-"})</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {form.data?.employees?.[0]?.department || form.employee?.department || "-"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {form.data?.employees?.[0]?.position || form.employee?.position || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {form.type === "leave" ? (
                      <div className="text-sm">
                        <div>
                          <span className="font-medium">Type:</span> {form.data?.leaveType}
                        </div>
                        <div>
                          <span className="font-medium">Period:</span>{" "}
                          {form.data?.startDate && form.data?.endDate ? (
                            <>
                              {new Date(form.data.startDate).toLocaleDateString()} -{" "}
                              {new Date(form.data.endDate).toLocaleDateString()}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Days:</span>{" "}
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                            {form.data?.totalDays || "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : form.type === "overtime" ? (
                      <div className="text-sm">
                        <div>
                          <span className="font-medium">Date:</span>{" "}
                          {form.data?.date ? new Date(form.data.date).toLocaleDateString() : "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Hours:</span>{" "}
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                            {form.data?.hours || "N/A"}
                          </span>
                        </div>
                        <div className="max-w-xs">
                          <span className="font-medium">Reason:</span>{" "}
                          <span className="line-clamp-1">{form.data?.reason || "N/A"}</span>
                        </div>
                      </div>
                    ) : form.type === "job-requisition" ? (
                      <div className="text-sm">
                        <div>
                          <span className="font-medium">Position:</span> {form.data?.requestPosition || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Department:</span> {form.data?.departmentName || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                            {form.data?.employmentType || "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : form.type === "training-request" ? (
                      <div className="text-sm">
                        <div>
                          <span className="font-medium">Training:</span> {form.data?.trainingTitle || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Provider:</span> {form.data?.trainingProvider || "PT"}
                        </div>
                        <div>
                          <span className="font-medium">Mode:</span>{" "}
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                            {form.data?.trainingMode || "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">Unknown form type</div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-medium flex items-center transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => handleViewForm(form.id)}
                        disabled={viewingFormId === form.id}
                      >
                        {viewingFormId === form.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </>
                        )}
                      </Button>
                      {normalizeStatus(form.status) === "PENDING" && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onApprove(form.id)}>
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
})
