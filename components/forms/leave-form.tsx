"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Trash2,
  Calendar,
  User,
  Briefcase,
  Building,
  AlertCircle,
  Loader2,
  Search,
  Upload,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { motion } from "framer-motion"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

// Add these interfaces near the top of the file with the other interfaces
interface Holiday {
  date: string
  name: string
}

interface HolidayWarning {
  count: number
  holidays: Holiday[]
}

// Add these interfaces at the top of the file, after the existing imports and before the LeaveFormProps interface

interface LeaveBalance {
  daysRequested: number
  remainingAfter: number
}

interface LeaveFormData {
  employees: { name: string; position: string; employeeId: string; department: string; userId?: string }[]
  leaveType: string
  startDate: string
  endDate: string
  totalDays: string
  reason: string
  supportingDocuments: string[]
  leaveBalance?: LeaveBalance
  jumlahHari?: number
  isHalfDay?: boolean
  halfDayPeriod?: string | undefined
  isEarlyLeave?: boolean
  earlyLeaveTime?: string | undefined
  userId?: string
}

interface FormSubmissionData {
  type: string
  formData: LeaveFormData
  signature: string
  supportingDocuments: string[]
  jumlahHariCuti: number
  isEarlyLeave?: boolean
  earlyLeaveTime?: string | undefined
}

interface LeaveFormProps {
  user: any
}

// Add this new interface for database employees
interface DbEmployee {
  id: string
  name: string
  employeeId: string
  department: string
  position: string
  jatahcuti: number
  cutiterpakai: number
  sisaCuti?: number
}

export default function LeaveFormComponent({ user }: LeaveFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // Form state
  const [leaveType, setLeaveType] = useState("Annual Leave")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [totalDays, setTotalDays] = useState("")
  const [reason, setReason] = useState("")
  const [supportingDocs, setSupportingDocs] = useState<string[]>([])
  const [signatureMethod, setSignatureMethod] = useState("draw")
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formProgress, setFormProgress] = useState(0)
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDayPeriod, setHalfDayPeriod] = useState("morning")
  const [draftSaved, setDraftSaved] = useState(false)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [holidayWarning, setHolidayWarning] = useState<HolidayWarning | null>(null)
  const [includesWeekends, setIncludesWeekends] = useState(false)
  const [isEarlyLeave, setIsEarlyLeave] = useState(false)
  const [earlyLeaveTime, setEarlyLeaveTime] = useState("")

  // New state for employee search and selection
  const [dbEmployees, setDbEmployees] = useState<DbEmployee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredEmployees, setFilteredEmployees] = useState<DbEmployee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<DbEmployee | null>(null)
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false)

  // Leave balance state
  const [leaveBalance, setLeaveBalance] = useState({
    total: user?.jatahcuti || 12,
    used: user?.cutiterpakai || 0,
    remaining: (user?.jatahcuti || 12) - (user?.cutiterpakai || 0),
  })

  // Employee Information
  const [employees, setEmployees] = useState([{ name: "", position: "", employeeId: "", department: "", userId: "" }])

  // Supporting documents
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])

  // Fetch employees from the database
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true)
      try {
        const response = await fetch("/api/users")
        if (!response.ok) {
          throw new Error("Failed to fetch employees")
        }
        const data = await response.json()
        setDbEmployees(data)
        setFilteredEmployees(data)
      } catch (error) {
        console.error("Error fetching employees:", error)
        toast({
          title: "Error",
          description: "Failed to load employees from database",
          variant: "destructive",
        })
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    fetchEmployees()
  }, [toast])

  // Filter employees based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEmployees(dbEmployees)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = dbEmployees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(query) ||
          emp.employeeId?.toLowerCase().includes(query) ||
          emp.department?.toLowerCase().includes(query),
      )
      setFilteredEmployees(filtered)
    }
  }, [searchQuery, dbEmployees])

  // Tambahkan useEffect untuk memperbarui leaveBalance ketika user berubah
  useEffect(() => {
    if (user) {
      setLeaveBalance({
        total: user.jatahcuti || 12,
        used: user.cutiterpakai || 0,
        remaining: (user.jatahcuti || 12) - (user.cutiterpakai || 0),
      })
    }
  }, [user])

  // Update progress bar
  useEffect(() => {
    if (currentStep === 1) {
      setFormProgress(33)
    } else if (currentStep === 2) {
      setFormProgress(66)
    } else {
      setFormProgress(100)
    }
  }, [currentStep])

  // Update employee info when an employee is selected from search
  useEffect(() => {
    if (selectedEmployee) {
      setEmployees([
        {
          name: selectedEmployee.name,
          position: selectedEmployee.position || "",
          employeeId: selectedEmployee.employeeId || "",
          department: selectedEmployee.department || "",
          userId: selectedEmployee.id,
        },
      ])

      // Update leave balance based on selected employee
      setLeaveBalance({
        total: selectedEmployee.jatahcuti || 12,
        used: selectedEmployee.cutiterpakai || 0,
        remaining:
          selectedEmployee.sisaCuti !== undefined
            ? selectedEmployee.sisaCuti
            : (selectedEmployee.jatahcuti || 12) - (selectedEmployee.cutiterpakai || 0),
      })
    }
  }, [selectedEmployee])

  const handleDocTypeChange = (value: string) => {
    if (selectedDocTypes.includes(value)) {
      setSelectedDocTypes(selectedDocTypes.filter((type) => type !== value))
    } else {
      setSelectedDocTypes([...selectedDocTypes, value])
    }
  }

  // Handle adding a new employee manually
  const handleAddEmployee = () => {
    setEmployees([...employees, { name: "", position: "", employeeId: "", department: "", userId: "" }])
  }

  // Handle employee selection from search
  const handleEmployeeSelect = (employee: DbEmployee) => {
    setSelectedEmployee(employee)
    setEmployeeSearchOpen(false)
  }

  // Calculate total days when dates change
  const calculateTotalDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

      // If half-day is enabled, ensure total days is 1 and set to 0.5
      if (isHalfDay) {
        if (diffDays > 1) {
          // If dates span multiple days but half-day is selected, set end date to start date
          setEndDate(startDate)
          setTotalDays("0.5")
        } else {
          setTotalDays("0.5")
        }
      }
      // If early leave is enabled, ensure total days is 1 and set to 1
      else if (isEarlyLeave) {
        if (diffDays > 1) {
          // If dates span multiple days but early leave is selected, set end date to start date
          setEndDate(startDate)
        }
        setTotalDays("1")
      } else {
        setTotalDays(diffDays.toString())
      }
    }
  }

  const saveDraft = () => {
    const formData = {
      employees,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      supportingDocs,
      isHalfDay,
      halfDayPeriod,
      isEarlyLeave,
      earlyLeaveTime,
      leaveBalance,
    }

    localStorage.setItem("leaveFormDraft", JSON.stringify(formData))
    setDraftSaved(true)

    toast({
      title: "Draft Saved",
      description: "Your form data has been saved as a draft",
    })

    // Reset the saved notification after 3 seconds
    setTimeout(() => {
      setDraftSaved(false)
    }, 3000)
  }

  const checkForWeekends = (start: string, end: string): boolean => {
    if (!start || !end) return false

    const startDate = new Date(start)
    const endDate = new Date(end)
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // 0 is Sunday, 6 is Saturday
        return true
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return false
  }

  const checkForHolidays = (start: string, end: string): void => {
    if (!start || !end) return

    // This is a simplified example - in a real app, you would fetch holidays from an API
    // For demonstration, we'll use a hardcoded list
    const sampleHolidays: Holiday[] = [
      { date: "2025-01-01", name: "New Year's Day" },
      { date: "2025-05-01", name: "Labor Day" },
      { date: "2025-08-17", name: "Independence Day" },
      { date: "2025-12-25", name: "Christmas" },
      // Add more holidays as needed
    ]

    setHolidays(sampleHolidays)

    const startDate = new Date(start)
    const endDate = new Date(end)

    const overlappingHolidays = sampleHolidays.filter((holiday) => {
      const holidayDate = new Date(holiday.date)
      return holidayDate >= startDate && holidayDate <= endDate
    })

    if (overlappingHolidays.length > 0) {
      setHolidayWarning({
        count: overlappingHolidays.length,
        holidays: overlappingHolidays,
      })
    } else {
      setHolidayWarning(null)
    }
  }

  useEffect(() => {
    const savedDraft = localStorage.getItem("leaveFormDraft")
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft)

        // Populate form with draft data
        if (draftData.employees) setEmployees(draftData.employees)
        if (draftData.leaveType) setLeaveType(draftData.leaveType)
        if (draftData.startDate) setStartDate(draftData.startDate)
        if (draftData.endDate) setEndDate(draftData.endDate)
        if (draftData.totalDays) setTotalDays(draftData.totalDays)
        if (draftData.reason) setReason(draftData.reason)
        if (draftData.supportingDocs) setSupportingDocs(draftData.supportingDocs)
        if (draftData.isHalfDay !== undefined) setIsHalfDay(draftData.isHalfDay)
        if (draftData.halfDayPeriod) setHalfDayPeriod(draftData.halfDayPeriod)
        if (draftData.isEarlyLeave !== undefined) setIsEarlyLeave(draftData.isEarlyLeave)
        if (draftData.earlyLeaveTime) setEarlyLeaveTime(draftData.earlyLeaveTime)

        toast({
          title: "Draft Loaded",
          description: "Your previously saved form data has been loaded",
        })
      } catch (error) {
        console.error("Error loading draft:", error)
      }
    }
  }, [])

  // Update the useEffect that calculates total days and leave balance
  useEffect(() => {
    if (startDate && endDate) {
      calculateTotalDays()
      checkForHolidays(startDate, endDate)
      setIncludesWeekends(checkForWeekends(startDate, endDate))
    }

    // Automatically calculate remaining leave when total days or leave type changes
    if (leaveType === "Annual Leave" && totalDays) {
      const daysToTake = isHalfDay ? 0.5 : Number(totalDays) || 0
      setLeaveBalance((prev) => ({
        ...prev,
        used: daysToTake, // Set used days to the current request days
        remaining: prev.total - daysToTake,
      }))
    } else {
      // Reset remaining to initial value if not Annual Leave
      setLeaveBalance((prev) => ({
        ...prev,
        remaining: prev.total - prev.used,
      }))
    }
  }, [startDate, endDate, isHalfDay, isEarlyLeave, totalDays, leaveType])

  // Handle file upload for signature
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedSignature(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Clear signature
  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
  }

  // Get signature data
  const getSignature = () => {
    if (signatureMethod === "draw" && signatureRef.current) {
      if (signatureRef.current.isEmpty()) {
        toast({
          title: "Signature Required",
          description: "Please provide your signature",
          variant: "destructive",
        })
        return null
      }
      return signatureRef.current.toDataURL()
    } else if (signatureMethod === "upload") {
      if (!uploadedSignature) {
        toast({
          title: "Signature Required",
          description: "Please upload your signature",
          variant: "destructive",
        })
        return null
      }
      return uploadedSignature
    }
    return null
  }

  // Validate current step
  const validateStep = () => {
    if (currentStep === 1) {
      // Validate employee information
      for (const employee of employees) {
        if (!employee.name || !employee.position || !employee.employeeId || !employee.department) {
          toast({
            title: "Missing Information",
            description: "Please fill in all employee information fields",
            variant: "destructive",
          })
          return false
        }
      }
      return true
    } else if (currentStep === 2) {
      // Validate leave details
      if (!startDate || !endDate || !totalDays || !reason) {
        toast({
          title: "Missing Information",
          description: "Please fill in all leave details",
          variant: "destructive",
        })
        return false
      }

      // Validate dates
      if (new Date(startDate) > new Date(endDate)) {
        toast({
          title: "Invalid Dates",
          description: "Start date cannot be after end date",
          variant: "destructive",
        })
        return false
      }

      // Check if employee has enough leave balance
      if (leaveType === "Annual Leave") {
        const daysToTake = isHalfDay ? 0.5 : Number(totalDays) || 0
        if (leaveBalance.remaining < 0) {
          toast({
            title: "Insufficient Leave Balance",
            description: "Employee does not have enough leave balance",
            variant: "destructive",
          })
          return false
        }
      }

      return true
    }

    return true
  }

  // Handle next step
  const handleNextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Update the handleSubmit function to use the new leave-balance endpoint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Get signature
      const signature = getSignature()
      if (!signature) {
        setIsSubmitting(false)
        return
      }

      // Parse total days as a number
      const daysRequested = isHalfDay ? 0.5 : Number(totalDays) || 0

      // Prepare form data
      const formData: FormSubmissionData = {
        type: "leave",
        formData: {
          employees: employees,
          leaveType,
          startDate,
          endDate,
          totalDays,
          reason,
          supportingDocuments: selectedDocTypes,
          jumlahHari: daysRequested,
          isHalfDay: isHalfDay,
          halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
          isEarlyLeave: isEarlyLeave,
          earlyLeaveTime: isEarlyLeave ? earlyLeaveTime : undefined,
          // Add userId for the employee requesting leave
          userId: selectedEmployee?.id || employees[0]?.userId || user?.id,
        },
        signature,
        supportingDocuments: supportingDocs,
        jumlahHariCuti: daysRequested,
        isEarlyLeave: isEarlyLeave,
        earlyLeaveTime: isEarlyLeave ? earlyLeaveTime : undefined,
      }

      // Update leave balance if it's annual leave
      if (leaveType === "Annual Leave") {
        formData.formData.leaveBalance = {
          daysRequested: daysRequested,
          remainingAfter: leaveBalance.remaining,
        }
      }

      // Submit form to the forms API
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        // Improved error handling for empty responses
        let errorMessage = "Failed to submit form"
        try {
          const data = await response.json()
          if (data && data.error) {
            errorMessage = data.error
          }
        } catch (jsonError) {
          // If JSON parsing fails, use status text or a generic message
          errorMessage = response.statusText || `Error: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // We no longer update the leave balance here
      // The leave balance will be updated when the form is approved
      // This prevents premature deduction of leave days

      // Send email notifications
      try {
        // Prepare notification data
        const notificationData = {
          type: "leave",
          formNumber: result.formNumber || "N/A",
          employeeName: employees[0].name,
          employeeId: employees[0].employeeId,
          department: employees[0].department,
          leaveType: leaveType,
          startDate: startDate,
          endDate: endDate,
          totalDays: totalDays,
          isHalfDay: isHalfDay,
          halfDayPeriod: halfDayPeriod,
          isEarlyLeave: isEarlyLeave,
          earlyLeaveTime: earlyLeaveTime,
          reason: reason,
          status: "pending",
        }

        // Send notification to HRD
        await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: "meliana.htm@gmail.com,admn.htmf@gmail.com", // Will be replaced by environment variable
            subject: `Leave Request Submitted - ${employees[0].name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 5px;">
                <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px;">New Leave Request</h2>
                <p>A new leave request has been submitted and requires your review:</p>
                
                <div style="background-color: #f0fdfa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p><strong>Form Number:</strong> ${result.formNumber || "N/A"}</p>
                  <p><strong>Employee:</strong> ${employees[0].name} (${employees[0].employeeId})</p>
                  <p><strong>Department:</strong> ${employees[0].department}</p>
                  <p><strong>Leave Type:</strong> ${leaveType}</p>
                  <p><strong>Period:</strong> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
                  <p><strong>Total Days:</strong> ${
                    isHalfDay
                      ? "0.5 (Half Day - " + halfDayPeriod + ")"
                      : isEarlyLeave
                        ? "1 (Early Leave at " + earlyLeaveTime + ")"
                        : totalDays
                  }</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                  <p><strong>Status:</strong> Pending Approval</p>
                </div>
                
                <p>Please log in to the HR Management System to review and process this request.</p>
                
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                  <p>This is an automated notification from PT. Hang Tong Manufactory HR Management System.</p>
                </div>
              </div>
            `,
          }),
        })
      } catch (emailError) {
        console.error("Error sending email notification:", emailError)
        // Don't block the form submission if email fails
      }

      // Update the success toast message to include notification info
      toast({
        title: "Success",
        description:
          "Leave form submitted successfully. Email notifications have been sent to HRD. Your leave balance will be updated when the request is approved.",
      })
      router.push("/dashboard")
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit leave form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update the color scheme from blue to teal/cyan
  // Change the main container background color
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  // Add this useEffect to reset options when leave type changes
  useEffect(() => {
    if (leaveType === "Annual Leave") {
      setIsHalfDay(false)
      setIsEarlyLeave(false)
    }
  }, [leaveType])

  return (
    <div className="min-h-screen bg-teal-50/50 dark:bg-slate-900 py-8">
      <Button variant="ghost" className="mb-4 group" onClick={() => router.push("/dashboard")}>
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="group-hover:underline">Back to Dashboard</span>
      </Button>

      <Card className="max-w-4xl mx-auto border-gray-200 shadow-sm border-l-4 border-l-teal-500 dark:border-l-teal-400 overflow-hidden">
        <CardHeader className="text-center border-b bg-gradient-to-r from-teal-50 to-white dark:from-slate-800 dark:to-slate-800/80">
          <div className="flex justify-center mb-2">
            <div className="relative w-16 h-16">
              <Image
                src="/images/Logo.jpg"
                alt="PT HANG TONG MANUFACTORY"
                width={64}
                height={64}
                className="rounded-md"
              />
            </div>
          </div>
          <CardTitle className="text-xl bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
            PT HANG TONG MANUFACTORY
          </CardTitle>
          <CardDescription className="text-lg font-semibold">LEAVE FORM</CardDescription>

          {/* Progress bar */}
          <div className="w-full mt-6 bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <motion.div
              className="bg-teal-600 dark:bg-teal-500 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${formProgress}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>

          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span className={currentStep >= 1 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
              Employee Info
            </span>
            <span className={currentStep >= 2 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
              Leave Details
            </span>
            <span className={currentStep >= 3 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>Signature</span>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-6">
            {/* Step 1: Employee Information */}
            {currentStep === 1 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center">
                      <User className="mr-2 h-5 w-5 text-teal-500" />
                      Employee Information
                    </h3>

                    {/* Employee Search */}
                    <div className="flex items-center gap-2">
                      <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[250px] justify-between border-slate-300 dark:border-slate-700"
                          >
                            {selectedEmployee ? selectedEmployee.name : "Search Employee..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="end">
                          <Command>
                            <CommandInput
                              placeholder="Search employee..."
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No employee found.</CommandEmpty>
                              <CommandGroup>
                                {isLoadingEmployees ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                ) : (
                                  filteredEmployees.map((employee) => (
                                    <CommandItem
                                      key={employee.id}
                                      value={employee.name}
                                      onSelect={() => handleEmployeeSelect(employee)}
                                    >
                                      <div className="flex flex-col">
                                        <span>{employee.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {employee.employeeId} - {employee.department}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEmployees([
                            ...employees,
                            { name: "", position: "", employeeId: "", department: "", userId: "" },
                          ])
                        }}
                        className="flex items-center gap-1 border-slate-300 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-teal-500"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" x2="19" y1="8" y2="14" />
                          <line x1="22" x2="16" y1="11" y2="11" />
                        </svg>
                        Add Employee
                      </Button>
                    </div>
                  </div>

                  {employees.map((employee, index) => (
                    <motion.div
                      key={index}
                      className="border rounded-md p-5 space-y-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium flex items-center">
                          <span className="flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full w-5 h-5 text-xs mr-2">
                            {index + 1}
                          </span>
                          Employee #{index + 1}
                        </h4>
                        {employees.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newEmployees = [...employees]
                              newEmployees.splice(index, 1)
                              setEmployees(newEmployees)
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor={`employee-name-${index}`} className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-400" />
                            Employee Name
                          </Label>
                          <Input
                            id={`employee-name-${index}`}
                            value={employee.name}
                            onChange={(e) => {
                              const newEmployees = [...employees]
                              newEmployees[index].name = e.target.value
                              setEmployees(newEmployees)
                            }}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                            placeholder="Enter full name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`position-${index}`} className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                            Position
                          </Label>
                          <Input
                            id={`position-${index}`}
                            value={employee.position}
                            onChange={(e) => {
                              const newEmployees = [...employees]
                              newEmployees[index].position = e.target.value
                              setEmployees(newEmployees)
                            }}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                            placeholder="Enter position"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`employee-id-${index}`} className="flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-1 text-gray-400"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="M7 7h.01" />
                              <path d="M7 17h.01" />
                              <path d="M17 7h.01" />
                              <path d="M17 17h.01" />
                              <path d="M12 12h.01" />
                            </svg>
                            Employee ID
                          </Label>
                          <Input
                            id={`employee-id-${index}`}
                            value={employee.employeeId}
                            onChange={(e) => {
                              const newEmployees = [...employees]
                              newEmployees[index].employeeId = e.target.value
                              setEmployees(newEmployees)
                            }}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                            placeholder="Enter employee ID"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`department-${index}`} className="flex items-center">
                            <Building className="h-4 w-4 mr-1 text-gray-400" />
                            Department
                          </Label>
                          <Input
                            id={`department-${index}`}
                            value={employee.department}
                            onChange={(e) => {
                              const newEmployees = [...employees]
                              newEmployees[index].department = e.target.value
                              setEmployees(newEmployees)
                            }}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                            placeholder="Enter department"
                            required
                          />
                        </div>
                      </div>

                      {/* Display leave balance for selected employee */}
                      {selectedEmployee && employee.userId && (
                        <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-md border border-teal-100 dark:border-teal-800/30">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-teal-700 dark:text-teal-300">Leave Balance:</div>
                            <div className="flex space-x-4 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                                <span className="font-medium ml-1">{leaveBalance.total} days</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Used:</span>
                                <span className="font-medium ml-1">{leaveBalance.used} days</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                                <span className="font-medium ml-1">{leaveBalance.remaining} days</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Add Employee Button at the bottom of the list */}
                  <motion.div
                    className="mt-4 flex justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEmployee}
                      className="w-full max-w-md border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-200 text-teal-600 dark:text-teal-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 text-teal-500"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" x2="19" y1="8" y2="14" />
                        <line x1="22" x2="16" y1="11" y2="11" />
                      </svg>
                      Add Another Employee
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Leave Details */}
            {currentStep === 2 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                {/* Type of Leave and Supporting Documents - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Leave Type */}
                  <div>
                    <h3 className="text-lg font-medium flex items-center mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 text-teal-500"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M12 18v-6" />
                        <path d="m9 15 3 3 3-3" />
                      </svg>
                      Type of Leave
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm h-full hover:shadow-md transition-all duration-300">
                      <RadioGroup value={leaveType} onValueChange={setLeaveType} className="flex flex-col space-y-2">
                        {[
                          { value: "Annual Leave", id: "annual", icon: "🏖️" },
                          { value: "Unpaid Leave", id: "unpaid", icon: "💸" },
                          { value: "Sick Leave", id: "sick", icon: "🏥" },
                          { value: "Bereavement", id: "bereavement", icon: "💐" },
                          { value: "Maternity Leave", id: "maternity", icon: "👶" },
                          { value: "Marriage Leave", id: "marriage", icon: "💍" },
                          { value: "Other", id: "other", icon: "📝" },
                        ].map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center space-x-2 p-3 rounded-md border transition-all duration-200 ${
                              leaveType === item.value
                                ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20"
                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <RadioGroupItem value={item.value} id={item.id} />
                            <Label htmlFor={item.id} className="flex items-center cursor-pointer">
                              <span className="mr-2">{item.icon}</span>
                              {item.value}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  <div>
                    <h3 className="text-lg font-medium flex items-center mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 text-teal-500"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                      </svg>
                      Supporting Documents
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm h-full hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col space-y-2">
                        {[
                          { id: "medical", label: "Medical Certificate (MC)", icon: "🩺" },
                          { id: "death", label: "Death Certificate", icon: "📜" },
                          { id: "childbirth", label: "Childbirth Certificate", icon: "👶" },
                          { id: "other", label: "Other Documents", icon: "📄" },
                        ].map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center space-x-2 p-3 rounded-md border transition-all duration-200 ${
                              selectedDocTypes.includes(item.label)
                                ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20"
                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <Checkbox
                              id={item.id}
                              checked={selectedDocTypes.includes(item.label)}
                              onCheckedChange={() => handleDocTypeChange(item.label)}
                            />
                            <Label htmlFor={item.id} className="flex items-center cursor-pointer">
                              <span className="mr-2">{item.icon}</span>
                              {item.label}
                            </Label>
                          </div>
                        ))}

                        {selectedDocTypes.includes("Other Documents") && (
                          <div className="mt-2 pl-8">
                            <Input
                              placeholder="Specify other documents..."
                              className="text-sm border-slate-300 dark:border-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Period of Leave Application */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium flex items-center mb-3">
                    <Calendar className="mr-2 h-5 w-5 text-teal-500" />
                    Period of Leave Application
                  </h3>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-1 text-gray-400"
                          >
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <line x1="3" x2="21" y1="9" y2="9" />
                            <line x1="9" x2="9" y1="3" y2="21" />
                          </svg>
                          Start Date
                        </Label>
                        <div className="relative">
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value)
                            }}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate" className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-1 text-gray-400"
                          >
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <line x1="3" x2="21" y1="9" y2="9" />
                            <line x1="15" x2="15" y1="3" y2="21" />
                          </svg>
                          End Date
                        </Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value)
                          }}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalDays" className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-1 text-gray-400"
                          >
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <path d="M8 12h8" />
                            <path d="M12 8v8" />
                          </svg>
                          Total Leave Days
                        </Label>
                        <Input
                          id="totalDays"
                          value={totalDays}
                          onChange={(e) => setTotalDays(e.target.value)}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="col-span-3 mt-2">
                        <Label htmlFor="halfDayOption" className="flex items-center mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-1 text-gray-400"
                          >
                            <path d="M12 2v20" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                          Half-Day Option
                        </Label>
                        {leaveType !== "Annual Leave" && (
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="isHalfDay"
                                checked={isHalfDay}
                                onCheckedChange={(checked) => {
                                  setIsHalfDay(checked === true)
                                  if (checked === true) {
                                    // If half-day is checked, ensure early leave is unchecked
                                    setIsEarlyLeave(false)
                                    // If half-day is checked and total days is more than 1, reset to 1
                                    if (Number(totalDays) > 1) {
                                      setTotalDays("1")
                                    }
                                  }
                                }}
                              />
                              <Label htmlFor="isHalfDay" className="cursor-pointer">
                                Enable half-day leave
                              </Label>
                            </div>

                            {isHalfDay && (
                              <RadioGroup
                                value={halfDayPeriod}
                                onValueChange={setHalfDayPeriod}
                                className="flex items-center space-x-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="morning" id="morning" />
                                  <Label htmlFor="morning" className="cursor-pointer">
                                    Morning
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="afternoon" id="afternoon" />
                                  <Label htmlFor="afternoon" className="cursor-pointer">
                                    Afternoon
                                  </Label>
                                </div>
                              </RadioGroup>
                            )}
                          </div>
                        )}
                        {leaveType === "Annual Leave" && (
                          <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-md border border-gray-200 dark:border-slate-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Half-day option is not available for Annual Leave requests.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 mt-4">
                        <Label htmlFor="earlyLeaveOption" className="flex items-center mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-1 text-gray-400"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Early Leave Option
                        </Label>
                        {leaveType !== "Annual Leave" && (
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="isEarlyLeave"
                                checked={isEarlyLeave}
                                onCheckedChange={(checked) => {
                                  setIsEarlyLeave(checked === true)
                                  if (checked === true) {
                                    // If early leave is checked, ensure half-day is unchecked
                                    setIsHalfDay(false)
                                    // Set total days to 1 if it's more than 1
                                    if (Number(totalDays) > 1) {
                                      setTotalDays("1")
                                    }
                                    // Also ensure end date matches start date
                                    if (startDate) {
                                      setEndDate(startDate)
                                    }
                                  }
                                }}
                              />
                              <Label htmlFor="isEarlyLeave" className="cursor-pointer">
                                Request early leave
                              </Label>
                            </div>

                            {isEarlyLeave && (
                              <div className="flex items-center space-x-2">
                                <Label htmlFor="earlyLeaveTime" className="whitespace-nowrap">
                                  Leave at:
                                </Label>
                                <Input
                                  id="earlyLeaveTime"
                                  type="time"
                                  value={earlyLeaveTime}
                                  onChange={(e) => setEarlyLeaveTime(e.target.value)}
                                  className="w-32 border-slate-300 dark:border-slate-700"
                                  required={isEarlyLeave}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {leaveType === "Annual Leave" && (
                          <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-md border border-gray-200 dark:border-slate-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Early leave option is not available for Annual Leave requests.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {startDate && endDate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md"
                      >
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0" />
                          <p className="text-sm text-teal-700 dark:text-teal-300 whitespace-normal">
                            Your leave will be from{" "}
                            <span className="font-medium">
                              {new Date(startDate).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {new Date(endDate).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                            , for a total of <span className="font-medium">{totalDays} days</span>.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {holidayWarning && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-md"
                      >
                        <div className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0"
                          >
                            <path d="M8 2v4" />
                            <path d="M16 2v4" />
                            <rect width="18" height="18" x="3" y="4" rx="2" />
                            <path d="M3 10h18" />
                            <path d="M10 16h4" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                              Your leave request includes {holidayWarning.count} public holiday
                              {holidayWarning.count > 1 ? "s" : ""}:
                            </p>
                            <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 list-disc list-inside">
                              {holidayWarning.holidays.map((holiday: Holiday, index: number) => (
                                <li key={index}>
                                  {new Date(holiday.date).toLocaleDateString()} - {holiday.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {includesWeekends && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md"
                      >
                        <div className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0"
                          >
                            <rect width="18" height="18" x="3" y="4" rx="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                            <path d="M8 14h.01" />
                            <path d="M12 14h.01" />
                            <path d="M16 14h.01" />
                            <path d="M8 18h.01" />
                            <path d="M12 18h.01" />
                            <path d="M16 18h.01" />
                          </svg>
                          <p className="text-sm text-teal-700 dark:text-teal-300">
                            <strong>Note:</strong> Your leave request includes weekend days. Company policy may vary on
                            how these are counted.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {holidayWarning && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-md"
                      >
                        <div className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0"
                          >
                            <path d="M8 2v4" />
                            <path d="M16 2v4" />
                            <rect width="18" height="18" x="3" y="4" rx="2" />
                            <path d="M3 10h18" />
                            <path d="M10 16h4" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                              Your leave request includes {holidayWarning.count} public holiday
                              {holidayWarning.count > 1 ? "s" : ""}:
                            </p>
                            <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 list-disc list-inside">
                              {holidayWarning.holidays.map((holiday: Holiday, index: number) => (
                                <li key={index}>
                                  {new Date(holiday.date).toLocaleDateString()} - {holiday.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Annual Leave Information - Only show for Annual Leave */}
                {leaveType === "Annual Leave" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium flex items-center mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 text-teal-500"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Informasi Cuti
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="cutiTersedia"
                            className="text-sm text-teal-600 dark:text-teal-400 font-medium"
                          >
                            Cuti Yang Tersedia
                          </Label>
                          <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-md">
                            <Input
                              id="cutiTersedia"
                              type="number"
                              value={leaveBalance.total}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value) || 0
                                const daysToTake = isHalfDay ? 0.5 : Number(totalDays) || 0
                                setLeaveBalance((prev) => ({
                                  ...prev,
                                  total: value,
                                  remaining: value - daysToTake,
                                }))
                              }}
                              className="text-center text-2xl font-bold text-teal-700 dark:text-teal-300 border-0 bg-transparent focus:ring-0 p-0 h-auto"
                            />
                            <p className="text-xs text-teal-500 dark:text-teal-400 text-center mt-1">hari</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="cutiDiambil"
                            className="text-sm text-amber-600 dark:text-amber-400 font-medium"
                          >
                            Cuti Yang Diambil
                          </Label>
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                            <Input
                              id="cutiDiambil"
                              type="number"
                              value={isHalfDay ? 0.5 : Number(totalDays) || 0}
                              readOnly
                              className="text-center text-2xl font-bold text-amber-700 dark:text-amber-300 border-0 bg-transparent focus:ring-0 p-0 h-auto"
                            />
                            <p className="text-xs text-amber-500 dark:text-amber-400 text-center mt-1">hari</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sisaCuti" className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Sisa Cuti
                          </Label>
                          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                            <Input
                              id="sisaCuti"
                              type="number"
                              value={leaveBalance.remaining}
                              readOnly
                              className="text-center text-2xl font-bold text-green-700 dark:text-green-300 border-0 bg-transparent focus:ring-0 p-0 h-auto"
                            />
                            <p className="text-xs text-green-500 dark:text-green-400 text-center mt-1">hari</p>
                          </div>
                        </div>
                      </div>

                      {totalDays && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <AlertCircle className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0" />

                              <p className="text-sm text-teal-700 dark:text-teal-300">
                                Anda meminta <span className="font-medium">{totalDays} hari</span> cuti tahunan.
                              </p>
                            </div>
                            <div
                              className={`text-sm font-medium ${leaveBalance.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                            >
                              {leaveBalance.remaining} hari tersisa setelah permintaan ini
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reason for Leave */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium flex items-center mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 text-teal-500"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <line x1="9" x2="15" y1="10" y2="10" />
                      <line x1="12" x2="12" y1="7" y2="13" />
                    </svg>
                    Reasons
                  </h3>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Please provide detailed reasons for your leave request..."
                      className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Please provide clear and detailed information about your leave request to help with the approval
                      process.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Signature */}
            {currentStep === 3 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium flex items-center mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 text-teal-500"
                    >
                      <path d="M15 8h.01" />
                      <rect width="16" height="10" x="4" y="4" rx="2" />
                      <path d="M4 14h16" />
                      <path d="m10 20 4-6" />
                      <path d="m14 20-4-6" />
                    </svg>
                    Signature
                  </h3>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                    <Tabs defaultValue="draw" onValueChange={setSignatureMethod} className="w-full">
                      <TabsList className="mb-4 w-full grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1">
                        <TabsTrigger
                          value="draw"
                          className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 transition-all duration-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="M12 22a9.5 9.5 0 0 0 9.5-9.5A12.5 12.5 0 0 0 12 2a12.5 12.5 0 0 0-9.5 10.5A9.5 9.5 0 0 0 12 22Z" />
                            <path d="M8 12h8" />
                            <path d="M12 16V8" />
                          </svg>
                          Draw Signature
                        </TabsTrigger>
                        <TabsTrigger
                          value="upload"
                          className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 transition-all duration-200"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Signature
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="draw" className="space-y-4">
                        <div className="border rounded-md p-2 bg-white dark:bg-slate-900">
                          <SignatureCanvas
                            ref={signatureRef}
                            canvasProps={{
                              width: 500,
                              height: 200,
                              className: "w-full h-48 border rounded-md",
                            }}
                            backgroundColor="white"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearSignature}
                          className="transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 border-slate-300 dark:border-slate-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="M12 22a9.5 9.5 0 0 0 9.5-9.5A12.5 12.5 0 0 0 12 2a12.5 12.5 0 0 0-9.5 10.5A9.5 9.5 0 0 0 12 22Z" />
                            <path d="M8 12h8" />
                          </svg>
                          Clear Signature
                        </Button>
                      </TabsContent>

                      <TabsContent value="upload" className="space-y-4">
                        <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-white dark:bg-slate-900">
                          {uploadedSignature ? (
                            <motion.div
                              className="flex flex-col items-center"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Image
                                src={uploadedSignature || "/placeholder.svg"}
                                alt="Uploaded Signature"
                                width={300}
                                height={150}
                                className="mb-4 border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUploadedSignature(null)}
                                className="transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 border-slate-300 dark:border-slate-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Signature
                              </Button>
                            </motion.div>
                          ) : (
                            <motion.div
                              className="flex flex-col items-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="rounded-full bg-teal-50 dark:bg-teal-900/30 p-4 mb-4">
                                <Upload className="h-8 w-8 text-teal-500" />
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">
                                Upload your signature image (PNG or JPG)
                              </p>
                              <Input
                                id="signature-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="max-w-xs border-slate-300 dark:border-slate-700"
                              />
                            </motion.div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                {/* Summary */}
                <motion.div
                  className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md p-4 space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="font-medium text-teal-800 dark:text-teal-300">Request Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">Leave Type:</span> {leaveType}
                    </div>
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">Total Days:</span>{" "}
                      {isHalfDay
                        ? "0.5 (Half Day - " + halfDayPeriod + ")"
                        : isEarlyLeave
                          ? "1 (Early Leave at " + earlyLeaveTime + ")"
                          : totalDays || "Not specified"}
                    </div>
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">Start Date:</span>{" "}
                      {startDate ? new Date(startDate).toLocaleDateString() : "Not specified"}
                    </div>
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">End Date:</span>{" "}
                      {endDate ? new Date(endDate).toLocaleDateString() : "Not specified"}
                    </div>
                    <div className="col-span-2">
                      <span className="text-teal-600 dark:text-teal-400">Employees:</span>{" "}
                      {employees.map((e) => e.name).join(", ")}
                    </div>
                    {selectedEmployee && (
                      <div className="col-span-2">
                        <span className="text-teal-600 dark:text-teal-400">Remaining Leave After Request:</span>{" "}
                        <span
                          className={
                            leaveBalance.remaining < 0
                              ? "text-red-600 dark:text-red-400 font-bold"
                              : "text-green-600 dark:text-green-400 font-medium"
                          }
                        >
                          {leaveBalance.remaining} days
                        </span>
                        {leaveBalance.remaining < 0 && (
                          <span className="text-red-600 dark:text-red-400 ml-1">(Insufficient balance)</span>
                        )}
                      </div>
                    )}
                    <div className="col-span-2 mt-2 text-gray-600 dark:text-gray-400 text-xs">
                      <AlertCircle className="h-4 w-4 inline-block mr-1 text-teal-500" />
                      Leave balance will be updated when your request is approved by management.
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <div className="flex gap-2">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="group border-slate-300 dark:border-slate-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 group-hover:-translate-x-1 transition-transform duration-200"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Previous Step
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </Button>
              )}

              <Button type="button" variant="secondary" onClick={saveDraft} className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save Draft
                {draftSaved && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    ✓
                  </span>
                )}
              </Button>
            </div>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="group bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                Next Step
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-2 group-hover:translate-x-1 transition-transform duration-200"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Submit Leave Form
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
