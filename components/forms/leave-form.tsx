"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo, useReducer } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Users,
  Clock,
  FileText,
  X,
  Plus,
  CalendarDays,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { motion, AnimatePresence } from "framer-motion"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Types and Interfaces
interface Holiday {
  date: string
  name: string
}

interface LeaveBalance {
  total: number
  used: number
  remaining: number
}

interface Employee {
  name: string
  position: string
  employeeCode: string
  department: string
  userId?: string
}
interface DbEmployee {
  id: string
  name: string
  employeeCode: string
  department?: string
  position?: string
  leave: {
    total: number
    used: number
    remaining: number
  }
}

interface LeaveFormProps {
  user: any
}

interface UploadedDocument {
  documentType: string
  file: File
  preview: string
}

type DateSelectionMode = "range" | "manual"

// Form State Type
interface FormState {
  // Employee data
  employees: Employee[]
  selectedEmployee: DbEmployee | null

  // Leave details
  leaveType: string
  startDate: string
  endDate: string
  totalDays: string
  reason: string
  isHalfDay: boolean
  halfDayPeriod: string
  isEarlyLeave: boolean
  earlyLeaveTime: string

  dateSelectionMode: DateSelectionMode
  manualDates: string[]

  // Supporting documents
  selectedSupportingDocuments: string[]
  uploadedDocuments: UploadedDocument[]

  // Signature
  signatureMethod: string
  uploadedSignature: string | null

  // UI state
  currentStep: number
  formProgress: number
  isSubmitting: boolean
  draftSaved: boolean

  // Employee search
  searchQuery: string
  employeeSearchOpen: boolean

  // Leave balance
  leaveBalance: LeaveBalance

  // Validation warnings
  leaveDateConflicts: {
    holidays: Holiday[]
    includesWeekends: boolean
  }

  backupPerson: string
  includeSaturday: boolean
}

// Form Actions
type FormAction =
  | { type: "SET_EMPLOYEES"; payload: Employee[] }
  | { type: "SET_SELECTED_EMPLOYEE"; payload: DbEmployee | null }
  | { type: "SET_LEAVE_TYPE"; payload: string }
  | { type: "SET_DATES"; payload: { startDate: string; endDate: string } }
  | { type: "SET_TOTAL_DAYS"; payload: string }
  | { type: "SET_REASON"; payload: string }
  | { type: "SET_HALF_DAY"; payload: { isHalfDay: boolean; halfDayPeriod?: string } }
  | { type: "SET_EARLY_LEAVE"; payload: { isEarlyLeave: boolean; earlyLeaveTime?: string } }
  | { type: "SET_SUPPORTING_DOCUMENTS"; payload: string[] }
  | { type: "SET_UPLOADED_DOCUMENTS"; payload: UploadedDocument[] }
  | { type: "SET_SIGNATURE_METHOD"; payload: string }
  | { type: "SET_UPLOADED_SIGNATURE"; payload: string | null }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "SET_FORM_PROGRESS"; payload: number }
  | { type: "SET_IS_SUBMITTING"; payload: boolean }
  | { type: "SET_DRAFT_SAVED"; payload: boolean }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_EMPLOYEE_SEARCH_OPEN"; payload: boolean }
  | { type: "SET_LEAVE_BALANCE"; payload: LeaveBalance }
  | { type: "SET_LEAVE_DATE_CONFLICTS"; payload: { holidays: Holiday[]; includesWeekends: boolean } }
  | { type: "LOAD_DRAFT"; payload: Partial<FormState> }
  | { type: "SET_BACKUP_PERSON"; payload: string }
  | { type: "SET_INCLUDE_SATURDAY"; payload: boolean }
  | { type: "SET_DATE_SELECTION_MODE"; payload: DateSelectionMode }
  | { type: "SET_MANUAL_DATES"; payload: string[] }
  | { type: "ADD_MANUAL_DATE"; payload: string }
  | { type: "REMOVE_MANUAL_DATE"; payload: string }

// Initial state
const initialFormState: FormState = {
  employees: [{ name: "", position: "", employeeCode: "", department: "", userId: "" }],
  selectedEmployee: null,
  leaveType: "Annual Leave",
  startDate: "",
  endDate: "",
  totalDays: "",
  reason: "",
  isHalfDay: false,
  halfDayPeriod: "morning",
  isEarlyLeave: false,
  earlyLeaveTime: "",
  dateSelectionMode: "range",
  manualDates: [],
  selectedSupportingDocuments: [],
  uploadedDocuments: [],
  signatureMethod: "draw",
  uploadedSignature: null,
  currentStep: 1,
  formProgress: 33,
  isSubmitting: false,
  draftSaved: false,
  searchQuery: "",
  employeeSearchOpen: false,
  leaveBalance: { total: 0, used: 0, remaining: 0 },
  leaveDateConflicts: { holidays: [], includesWeekends: false },
  backupPerson: "",
  includeSaturday: false,
}

// Reducer function
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_EMPLOYEES":
      return { ...state, employees: action.payload }
    case "SET_SELECTED_EMPLOYEE":
      return { ...state, selectedEmployee: action.payload }
    case "SET_LEAVE_TYPE":
      return { ...state, leaveType: action.payload }
    case "SET_DATES":
      return { ...state, startDate: action.payload.startDate, endDate: action.payload.endDate }
    case "SET_TOTAL_DAYS":
      return { ...state, totalDays: action.payload }
    case "SET_REASON":
      return { ...state, reason: action.payload }
    case "SET_HALF_DAY":
      return {
        ...state,
        isHalfDay: action.payload.isHalfDay,
        halfDayPeriod: action.payload.halfDayPeriod || state.halfDayPeriod,
      }
    case "SET_EARLY_LEAVE":
      return {
        ...state,
        isEarlyLeave: action.payload.isEarlyLeave,
        earlyLeaveTime: action.payload.earlyLeaveTime || state.earlyLeaveTime,
      }
    case "SET_SUPPORTING_DOCUMENTS":
      return { ...state, selectedSupportingDocuments: action.payload }
    case "SET_UPLOADED_DOCUMENTS":
      return { ...state, uploadedDocuments: action.payload }
    case "SET_SIGNATURE_METHOD":
      return { ...state, signatureMethod: action.payload }
    case "SET_UPLOADED_SIGNATURE":
      return { ...state, uploadedSignature: action.payload }
    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload }
    case "SET_FORM_PROGRESS":
      return { ...state, formProgress: action.payload }
    case "SET_IS_SUBMITTING":
      return { ...state, isSubmitting: action.payload }
    case "SET_DRAFT_SAVED":
      return { ...state, draftSaved: action.payload }
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload }
    case "SET_EMPLOYEE_SEARCH_OPEN":
      return { ...state, employeeSearchOpen: action.payload }
    case "SET_LEAVE_BALANCE":
      return { ...state, leaveBalance: action.payload }
    case "SET_LEAVE_DATE_CONFLICTS":
      return { ...state, leaveDateConflicts: action.payload }
    case "LOAD_DRAFT":
      return { ...state, ...action.payload }
    case "SET_BACKUP_PERSON":
      return { ...state, backupPerson: action.payload }
    case "SET_INCLUDE_SATURDAY":
      return { ...state, includeSaturday: action.payload }
    case "SET_DATE_SELECTION_MODE":
      return { ...state, dateSelectionMode: action.payload }
    case "SET_MANUAL_DATES":
      return { ...state, manualDates: action.payload }
    case "ADD_MANUAL_DATE":
      if (state.manualDates.includes(action.payload)) {
        return state
      }
      return { ...state, manualDates: [...state.manualDates, action.payload].sort() }
    case "REMOVE_MANUAL_DATE":
      return { ...state, manualDates: state.manualDates.filter((d) => d !== action.payload) }
    default:
      return state
  }
}

// Custom hooks
const useEmployeeData = () => {
  const [dbEmployees, setDbEmployees] = useState<DbEmployee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const { toast } = useToast()

  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true)
    try {
      const response = await fetch("/api/employees")
      if (!response.ok) throw new Error("Failed to fetch employees")
      const data = await response.json()
      setDbEmployees(data)
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
  }, [toast])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  return { dbEmployees, isLoadingEmployees }
}

const useLeaveDateValidation = () => {
  const checkForWeekends = useCallback((start: string, end: string): boolean => {
    if (!start || !end) return false
    const startDate = new Date(start)
    const endDate = new Date(end)
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) return true
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return false
  }, [])

  const checkForHolidays = useCallback((start: string, end: string): Holiday[] => {
    if (!start || !end) return []

    const sampleHolidays: Holiday[] = [
      { date: "2025-01-01", name: "New Year's Day" },
      { date: "2025-05-01", name: "Labor Day" },
      { date: "2025-08-17", name: "Independence Day" },
      { date: "2025-12-25", name: "Christmas" },
    ]

    const startDate = new Date(start)
    const endDate = new Date(end)

    return sampleHolidays.filter((holiday) => {
      const holidayDate = new Date(holiday.date)
      return holidayDate >= startDate && holidayDate <= endDate
    })
  }, [])

  const checkForHolidaysManual = useCallback((dates: string[]): Holiday[] => {
    if (dates.length === 0) return []

    const sampleHolidays: Holiday[] = [
      { date: "2025-01-01", name: "New Year's Day" },
      { date: "2025-05-01", name: "Labor Day" },
      { date: "2025-08-17", name: "Independence Day" },
      { date: "2025-12-25", name: "Christmas" },
    ]

    return sampleHolidays.filter((holiday) => dates.includes(holiday.date))
  }, [])

  const checkForWeekendsManual = useCallback((dates: string[]): boolean => {
    return dates.some((date) => {
      const d = new Date(date)
      const dayOfWeek = d.getDay()
      return dayOfWeek === 0 || dayOfWeek === 6
    })
  }, [])

  return { checkForWeekends, checkForHolidays, checkForHolidaysManual, checkForWeekendsManual }
}

// Validation functions
const validateEmployeeInfo = (employees: Employee[]): boolean => {
  return employees.every(
    (employee) => employee.name && employee.position && employee.employeeCode && employee.department,
  )
}

const validateLeaveDetails = (
  startDate: string,
  endDate: string,
  totalDays: string,
  reason: string,
  leaveBalance: LeaveBalance,
  leaveType: string,
  isHalfDay: boolean,
  selectedSupportingDocuments: string[],
  uploadedDocuments: UploadedDocument[],
  dateSelectionMode: DateSelectionMode,
  manualDates: string[],
): boolean => {
  if (dateSelectionMode === "manual") {
    if (manualDates.length === 0 || !reason) return false
  } else {
    if (!startDate || !endDate || !totalDays || !reason) return false
    if (new Date(startDate) > new Date(endDate)) return false
  }

  if (leaveType === "Annual Leave") {
    const daysToTake = isHalfDay ? 0.5 : Number(totalDays) || 0
    if (leaveBalance.remaining < 0) return false
  }

  if (selectedSupportingDocuments.length > 0) {
    const allDocumentsUploaded = selectedSupportingDocuments.every((docType) =>
      uploadedDocuments.some((uploaded) => uploaded.documentType === docType),
    )
    if (!allDocumentsUploaded) return false
  }

  return true
}

const validateSignature = (
  signatureMethod: string,
  signatureRef: React.RefObject<SignatureCanvas>,
  uploadedSignature: string | null,
): boolean => {
  if (signatureMethod === "draw" && signatureRef.current) {
    return !signatureRef.current.isEmpty()
  }
  if (signatureMethod === "upload") {
    return !!uploadedSignature
  }
  return false
}

// Main component
export default function LeaveFormComponent({ user }: LeaveFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  const [formState, dispatch] = useReducer(formReducer, initialFormState)

  // Custom hooks
  const { dbEmployees, isLoadingEmployees } = useEmployeeData()
  const { checkForWeekends, checkForHolidays, checkForHolidaysManual, checkForWeekendsManual } =
    useLeaveDateValidation()

  // const remainingLeave = useMemo(() => {
  //   if (formState.selectedEmployee) {
  //     const jatah = formState.selectedEmployee.jatahcuti ?? 0
  //     const terpakai = formState.selectedEmployee.cutiterpakai ?? 0
  //     return jatah - terpakai
  //   }
  //   return (user?.jatahcuti || 12) - (user?.cutiterpakai || 0)
  // }, [formState.selectedEmployee, user])

  // Memoized filtered employees
  const filteredEmployees = useMemo(() => {
    const q = formState.searchQuery.trim().toLowerCase()
    if (!q) return dbEmployees

    return dbEmployees.filter((emp) =>
      [emp.name, emp.employeeCode, emp.department, emp.position]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    )
  }, [formState.searchQuery, dbEmployees])

  const calculatedTotalDays = useMemo(() => {
    // Handle manual date selection mode
    if (
      formState.dateSelectionMode === "manual" &&
      (formState.leaveType === "Annual Leave" || formState.leaveType === "Marriage Leave")
    ) {
      // Count only business days from manual dates
      let businessDays = 0
      formState.manualDates.forEach((date) => {
        const d = new Date(date)
        const dayOfWeek = d.getDay()
        if (formState.includeSaturday) {
          if (dayOfWeek !== 0) businessDays++
        } else {
          if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++
        }
      })
      return businessDays.toString()
    }

    // Handle range mode
    if (!formState.startDate || !formState.endDate) return ""

    const start = new Date(formState.startDate)
    const end = new Date(formState.endDate)

    if (formState.isHalfDay) return "0.5"
    if (formState.isEarlyLeave) return "1"

    let businessDays = 0
    const currentDate = new Date(start)

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()
      if (formState.includeSaturday) {
        if (dayOfWeek !== 0) {
          businessDays++
        }
      } else {
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          businessDays++
        }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return businessDays.toString()
  }, [
    formState.startDate,
    formState.endDate,
    formState.isHalfDay,
    formState.isEarlyLeave,
    formState.includeSaturday,
    formState.dateSelectionMode,
    formState.manualDates,
    formState.leaveType,
  ])

  // Effect for updating total days
  useEffect(() => {
    if (calculatedTotalDays !== formState.totalDays) {
      dispatch({ type: "SET_TOTAL_DAYS", payload: calculatedTotalDays })
    }
  }, [calculatedTotalDays, formState.totalDays])

  useEffect(() => {
    if (formState.dateSelectionMode === "manual" && formState.manualDates.length > 0) {
      const totalDaysCalculated = formState.manualDates.length
      const holidays = checkForHolidaysManual(formState.manualDates)
      const includesWeekends = checkForWeekendsManual(formState.manualDates)

      dispatch({ type: "SET_TOTAL_DAYS", payload: String(totalDaysCalculated) })
      dispatch({
        type: "SET_LEAVE_DATE_CONFLICTS",
        payload: { holidays, includesWeekends },
      })

      if (formState.leaveType === "Annual Leave" && formState.totalDays) {
        const daysToTake = Number(formState.totalDays) || 0
        const base = formState.selectedEmployee?.leave ?? {
          total: 0,
          used: 0,
          remaining: 0,
        }

        dispatch({
          type: "SET_LEAVE_BALANCE",
          payload: {
            total: base.total,
            used: base.used + daysToTake,
            remaining: base.remaining - daysToTake,
          },
        })
      }
    } else if (formState.startDate && formState.endDate) {
      const holidays = checkForHolidays(formState.startDate, formState.endDate)
      const includesWeekends = checkForWeekends(formState.startDate, formState.endDate)

      dispatch({
        type: "SET_LEAVE_DATE_CONFLICTS",
        payload: { holidays, includesWeekends },
      })

      if (formState.leaveType === "Annual Leave" && formState.totalDays) {
        const daysToTake = formState.isHalfDay ? 0.5 : Number(formState.totalDays) || 0
        const base = formState.selectedEmployee?.leave ?? {
          total: 0,
          used: 0,
          remaining: 0,
        }

        dispatch({
          type: "SET_LEAVE_BALANCE",
          payload: {
            total: base.total,
            used: base.used + daysToTake,
            remaining: base.remaining - daysToTake,
          },
        })
      }
    }
  }, [
    formState.startDate,
    formState.endDate,
    formState.leaveType,
    formState.totalDays,
    formState.isHalfDay,
    formState.selectedEmployee,
    formState.includeSaturday,
    formState.dateSelectionMode,
    formState.manualDates,
    checkForHolidays,
    checkForWeekends,
    checkForHolidaysManual,
    checkForWeekendsManual,
  ])

  // Effect for progress bar
  useEffect(() => {
    const progress = formState.currentStep === 1 ? 33 : formState.currentStep === 2 ? 66 : 100
    if (progress !== formState.formProgress) {
      dispatch({ type: "SET_FORM_PROGRESS", payload: progress })
    }
  }, [formState.currentStep, formState.formProgress])

  useEffect(() => {
    const emp = formState.selectedEmployee
    if (!emp) return

    dispatch({
      type: "SET_EMPLOYEES",
      payload: [
        {
          name: emp.name,
          position: emp.position ?? "",
          employeeCode: emp.employeeCode, // UI uses employeeCode
          department: emp.department ?? "",
          userId: emp.id,
        },
      ],
    })

    dispatch({
      type: "SET_LEAVE_BALANCE",
      payload: {
        total: emp.leave.total,
        used: emp.leave.used,
        remaining: emp.leave.remaining,
      },
    })
  }, [formState.selectedEmployee])

  // Effect for draft loading
  useEffect(() => {
    const savedDraft = localStorage.getItem("leaveFormDraft")
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft)
        dispatch({ type: "LOAD_DRAFT", payload: draftData })
        toast({
          title: "Draft Loaded",
          description: "Your previously saved form data has been loaded",
        })
      } catch (error) {
        console.error("Error loading draft:", error)
      }
    }
  }, [toast])

  // Effect for resetting options when leave type changes
  useEffect(() => {
    if (formState.leaveType === "Annual Leave" || formState.leaveType === "Marriage Leave") {
      dispatch({ type: "SET_HALF_DAY", payload: { isHalfDay: false } })
      dispatch({ type: "SET_EARLY_LEAVE", payload: { isEarlyLeave: false } })
    }
    if (formState.leaveType !== "Annual Leave" && formState.leaveType !== "Marriage Leave") {
      dispatch({ type: "SET_DATE_SELECTION_MODE", payload: "range" })
      dispatch({ type: "SET_MANUAL_DATES", payload: [] })
    }
  }, [formState.leaveType])

  // Effect for draft saved notification reset
  useEffect(() => {
    if (formState.draftSaved) {
      const timer = setTimeout(() => {
        dispatch({ type: "SET_DRAFT_SAVED", payload: false })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [formState.draftSaved])

  // Callback functions
  const handleEmployeeSelect = (employee: DbEmployee) => {
    dispatch({ type: "SET_SELECTED_EMPLOYEE", payload: employee })
    dispatch({ type: "SET_EMPLOYEE_SEARCH_OPEN", payload: false })
    dispatch({ type: "SET_SEARCH_QUERY", payload: "" })
  }

  const handleDocTypeChange = useCallback(
    (value: string) => {
      const updatedDocs = formState.selectedSupportingDocuments.includes(value)
        ? formState.selectedSupportingDocuments.filter((type) => type !== value)
        : [...formState.selectedSupportingDocuments, value]

      dispatch({ type: "SET_SUPPORTING_DOCUMENTS", payload: updatedDocs })

      if (formState.selectedSupportingDocuments.includes(value)) {
        const updatedUploadedDocs = formState.uploadedDocuments.filter((doc) => doc.documentType !== value)
        dispatch({ type: "SET_UPLOADED_DOCUMENTS", payload: updatedUploadedDocs })
      }
    },
    [formState.selectedSupportingDocuments, formState.uploadedDocuments],
  )

  const handleDocumentUpload = useCallback(
    (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const preview = event.target?.result as string
          const newDoc: UploadedDocument = {
            documentType,
            file,
            preview,
          }
          const updatedDocs = formState.uploadedDocuments.filter((doc) => doc.documentType !== documentType)
          dispatch({
            type: "SET_UPLOADED_DOCUMENTS",
            payload: [...updatedDocs, newDoc],
          })
        }
        reader.readAsDataURL(file)
      }
    },
    [formState.uploadedDocuments],
  )

  const handleRemoveDocument = useCallback(
    (documentType: string) => {
      const updatedDocs = formState.uploadedDocuments.filter((doc) => doc.documentType !== documentType)
      dispatch({ type: "SET_UPLOADED_DOCUMENTS", payload: updatedDocs })
    },
    [formState.uploadedDocuments],
  )

  const isDocumentUploaded = useCallback(
    (documentType: string) => {
      return formState.uploadedDocuments.some((doc) => doc.documentType === documentType)
    },
    [formState.uploadedDocuments],
  )

  const getUploadedDocumentPreview = useCallback(
    (documentType: string) => {
      return formState.uploadedDocuments.find((doc) => doc.documentType === documentType)?.preview
    },
    [formState.uploadedDocuments],
  )

  const handleAddEmployee = useCallback(() => {
    const newEmployees = [
      ...formState.employees,
      { name: "", position: "", employeeCode: "", department: "", userId: "" },
    ]
    dispatch({ type: "SET_EMPLOYEES", payload: newEmployees })
  }, [formState.employees])

  const handleRemoveEmployee = useCallback(
    (index: number) => {
      if (formState.employees.length > 1) {
        const newEmployees = formState.employees.filter((_, i) => i !== index)
        dispatch({ type: "SET_EMPLOYEES", payload: newEmployees })
      }
    },
    [formState.employees],
  )

  const handleEmployeeChange = useCallback(
    (index: number, field: keyof Employee, value: string) => {
      const newEmployees = [...formState.employees]
      newEmployees[index] = { ...newEmployees[index], [field]: value }
      dispatch({ type: "SET_EMPLOYEES", payload: newEmployees })
    },
    [formState.employees],
  )

  const saveDraft = useCallback(() => {
    const draftData = {
      employees: formState.employees,
      leaveType: formState.leaveType,
      startDate: formState.startDate,
      endDate: formState.endDate,
      totalDays: formState.totalDays,
      reason: formState.reason,
      selectedSupportingDocuments: formState.selectedSupportingDocuments,
      isHalfDay: formState.isHalfDay,
      halfDayPeriod: formState.halfDayPeriod,
      isEarlyLeave: formState.isEarlyLeave,
      earlyLeaveTime: formState.earlyLeaveTime,
      leaveBalance: formState.leaveBalance,
      backupPerson: formState.backupPerson,
      includeSaturday: formState.includeSaturday,
      dateSelectionMode: formState.dateSelectionMode,
      manualDates: formState.manualDates,
    }

    localStorage.setItem("leaveFormDraft", JSON.stringify(draftData))
    dispatch({ type: "SET_DRAFT_SAVED", payload: true })

    toast({
      title: "Draft Saved",
      description: "Your form data has been saved as a draft",
    })
  }, [formState, toast])

  const handleSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        dispatch({ type: "SET_UPLOADED_SIGNATURE", payload: event.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const clearSignature = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
  }, [])

  const getSignature = useCallback(() => {
    if (formState.signatureMethod === "draw" && signatureRef.current) {
      if (signatureRef.current.isEmpty()) {
        toast({
          title: "Signature Required",
          description: "Please provide your signature",
          variant: "destructive",
        })
        return null
      }
      return signatureRef.current.toDataURL()
    } else if (formState.signatureMethod === "upload") {
      if (!formState.uploadedSignature) {
        toast({
          title: "Signature Required",
          description: "Please upload your signature",
          variant: "destructive",
        })
        return null
      }
      return formState.uploadedSignature
    }
    return null
  }, [formState.signatureMethod, formState.uploadedSignature, toast])

  const validateCurrentStep = useCallback(() => {
    if (formState.currentStep === 1) {
      if (!validateEmployeeInfo(formState.employees)) {
        toast({
          title: "Missing Information",
          description: "Please fill in all employee information fields",
          variant: "destructive",
        })
        return false
      }
    } else if (formState.currentStep === 2) {
      if (formState.selectedSupportingDocuments.length > 0) {
        const missingUploads = formState.selectedSupportingDocuments.filter(
          (docType) => !formState.uploadedDocuments.some((uploaded) => uploaded.documentType === docType),
        )
        if (missingUploads.length > 0) {
          toast({
            title: "Document Upload Required",
            description: `Please upload proof for: ${missingUploads.join(", ")}`,
            variant: "destructive",
          })
          return false
        }
      }

      if (
        !validateLeaveDetails(
          formState.startDate,
          formState.endDate,
          formState.totalDays,
          formState.reason,
          formState.leaveBalance,
          formState.leaveType,
          formState.isHalfDay,
          formState.selectedSupportingDocuments,
          formState.uploadedDocuments,
          formState.dateSelectionMode,
          formState.manualDates,
        )
      ) {
        toast({
          title: "Invalid Leave Details",
          description: "Please check your leave details and ensure you have sufficient balance",
          variant: "destructive",
        })
        return false
      }
    } else if (formState.currentStep === 3) {
      function validateSignature(
        method: string,
        signatureRef: React.RefObject<SignatureCanvas | null>,
        uploadedSignature: File | null,
      ) {
        if (method === "drawn" && !signatureRef.current?.isEmpty()) {
          // validasi drawn signature
        }
      }
    }
    return true
  }, [formState, toast])

  const handleNextStep = useCallback(() => {
    if (validateCurrentStep()) {
      dispatch({ type: "SET_CURRENT_STEP", payload: formState.currentStep + 1 })
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [formState.currentStep, validateCurrentStep])

  const handlePrevStep = useCallback(() => {
    dispatch({ type: "SET_CURRENT_STEP", payload: formState.currentStep - 1 })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [formState.currentStep])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateCurrentStep()) return

      dispatch({ type: "SET_IS_SUBMITTING", payload: true })

      try {
        const signature = getSignature()
        if (!signature) {
          dispatch({ type: "SET_IS_SUBMITTING", payload: false })
          return
        }

        const daysRequested = formState.isHalfDay ? 0.5 : Number(formState.totalDays) || 0

        const includeLeaveBalance = formState.leaveType === "Annual Leave"

        const formData = {
          type: "leave",
          formData: {
            employees: formState.employees,
            leaveType: formState.leaveType,
            startDate: formState.dateSelectionMode === "manual" ? formState.manualDates[0] : formState.startDate,
            endDate:
              formState.dateSelectionMode === "manual"
                ? formState.manualDates[formState.manualDates.length - 1]
                : formState.endDate,
            totalDays: formState.totalDays,
            reason: formState.reason,
            supportingDocuments: formState.selectedSupportingDocuments,
            uploadedDocumentFiles: formState.uploadedDocuments.map((doc) => ({
              documentType: doc.documentType,
              fileName: doc.file.name,
              fileData: doc.preview,
            })),
            jumlahHari: daysRequested,
            isHalfDay: formState.isHalfDay,
            halfDayPeriod: formState.isHalfDay ? formState.halfDayPeriod : undefined,
            isEarlyLeave: formState.isEarlyLeave,
            earlyLeaveTime: formState.isEarlyLeave ? formState.earlyLeaveTime : undefined,
            backupPerson: formState.backupPerson,
            dateSelectionMode: formState.dateSelectionMode,
            manualDates: formState.dateSelectionMode === "manual" ? formState.manualDates : undefined,

            ...(includeLeaveBalance && {
              leaveBalance: {
                daysRequested: daysRequested,
                remainingAfter: formState.leaveBalance.remaining,
              },
            }),
          },
          signature,
          employeeId: formState.selectedEmployee?.id || user?.employee?.id,
          createdById: user?.id,
          supportingDocuments: formState.selectedSupportingDocuments,
          jumlahHariCuti: daysRequested,
          isEarlyLeave: formState.isEarlyLeave,
          earlyLeaveTime: formState.isEarlyLeave ? formState.earlyLeaveTime : undefined,
        }

        if (formState.leaveType === "Annual Leave") {
          formData.formData.leaveBalance = {
            daysRequested: daysRequested,
            remainingAfter: formState.leaveBalance.remaining,
          }
        }

        console.log("[v0] Submitting form data:", formData)

        const response = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          let errorMessage = "Failed to submit form"
          try {
            const data = await response.json()
            console.log("[v0] Error response:", data)
            if (data?.error) errorMessage = data.error
          } catch {
            errorMessage = response.statusText || `Error: ${response.status}`
          }
          throw new Error(errorMessage)
        }

        const result = await response.json()

        toast({
          title: "Success",
          description:
            "Leave form submitted successfully. Email notifications have been sent to HRD. Your leave balance will be updated when the request is approved.",
        })
        router.refresh()
        router.push("/dashboard")
      } catch (error) {
        console.error("Error submitting form:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to submit leave form",
          variant: "destructive",
        })
      } finally {
        dispatch({ type: "SET_IS_SUBMITTING", payload: false })
      }
    },
    [formState, validateCurrentStep, getSignature, user, toast, router],
  )

  const handleAddManualDate = useCallback(
    (date: string) => {
      if (date && !formState.manualDates.includes(date)) {
        dispatch({ type: "ADD_MANUAL_DATE", payload: date })
      }
    },
    [formState.manualDates],
  )

  const handleRemoveManualDate = useCallback((date: string) => {
    dispatch({ type: "REMOVE_MANUAL_DATE", payload: date })
  }, [])

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const [manualDateInput, setManualDateInput] = useState("")

  const supportsManualDates = formState.leaveType === "Annual Leave" || formState.leaveType === "Marriage Leave"

  return (
    <div className="min-h-screen bg-teal-50/50 dark:bg-slate-900 py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-4 group" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="group-hover:underline">Back to Dashboard</span>
        </Button>

        <Card className="border-gray-200 shadow-sm border-l-4 border-l-teal-500 dark:border-l-teal-400 overflow-hidden">
          <CardHeader className="text-center border-b bg-gradient-to-r from-teal-50 to-white dark:from-slate-800 dark:to-slate-800/80 px-4 sm:px-6">
            <div className="flex justify-center mb-2">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                <Image
                  src="/images/logo-cropped.png"
                  alt="PT HANG TONG MANUFACTORY"
                  width={64}
                  height={64}
                  className="rounded-md"
                />
              </div>
            </div>
            <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
              PT HANG TONG MANUFACTORY
            </CardTitle>
            <CardDescription className="text-base sm:text-lg font-semibold">LEAVE FORM</CardDescription>

            {/* Progress bar */}
            <div className="w-full mt-4 sm:mt-6 bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <motion.div
                className="bg-teal-600 dark:bg-teal-500 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${formState.formProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="flex justify-between mt-2 text-xs sm:text-sm text-gray-500">
              <span className={formState.currentStep >= 1 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
                Employee Info
              </span>
              <span className={formState.currentStep >= 2 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
                Leave Details
              </span>
              <span className={formState.currentStep >= 3 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
                Signature
              </span>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6 px-4 sm:px-6">
              {/* Step 1: Employee Information */}
              {formState.currentStep === 1 && (
                <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4 sm:space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <h3 className="text-base sm:text-lg font-medium flex items-center">
                        <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-teal-500" />
                        Employee Information
                      </h3>

                      {/* Employee Search */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Popover
                          open={formState.employeeSearchOpen}
                          onOpenChange={(open) => dispatch({ type: "SET_EMPLOYEE_SEARCH_OPEN", payload: open })}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full sm:w-[250px] justify-between border-slate-300 dark:border-slate-700 bg-transparent"
                            >
                              <span className="truncate">
                                {formState.selectedEmployee ? formState.selectedEmployee.name : "Search Employee..."}
                              </span>
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] sm:w-[250px] p-0" align="end">
                            <Command>
                              <CommandInput
                                placeholder="Search employee..."
                                value={formState.searchQuery}
                                onValueChange={(value) => dispatch({ type: "SET_SEARCH_QUERY", payload: value })}
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
                                        value={employee.id}
                                        onSelect={() => {
                                          handleEmployeeSelect(employee)
                                        }}
                                      >
                                        <div className="flex items-center">
                                          <User className="mr-2 h-4 w-4" />
                                          <span>{employee.name}</span>
                                        </div>
                                        <Badge variant="secondary" className="ml-2">
                                          {employee.leave.remaining} days left {/* Display sisaCuti from backend */}
                                        </Badge>
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
                          onClick={handleAddEmployee}
                          className="flex items-center gap-1 border-slate-300 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 whitespace-nowrap bg-transparent"
                        >
                          <User className="h-4 w-4 text-teal-500" />
                          <span className="hidden sm:inline">Add Employee</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </div>
                    </div>

                    {formState.employees.map((employee, index) => (
                      <motion.div
                        key={index}
                        className="border rounded-md p-4 sm:p-5 space-y-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]"
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
                          {formState.employees.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEmployee(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                          <div className="space-y-2">
                            <Label htmlFor={`employee-name-${index}`} className="flex items-center text-sm">
                              <User className="h-4 w-4 mr-1 text-gray-400" />
                              Employee Name
                            </Label>
                            <Input
                              id={`employee-name-${index}`}
                              value={employee.name}
                              onChange={(e) => handleEmployeeChange(index, "name", e.target.value)}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              placeholder="Enter full name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`position-${index}`} className="flex items-center text-sm">
                              <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                              Position
                            </Label>
                            <Input
                              id={`position-${index}`}
                              value={employee.position}
                              onChange={(e) => handleEmployeeChange(index, "position", e.target.value)}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              placeholder="Enter position"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`employee-id-${index}`} className="flex items-center text-sm">
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
                              value={employee.employeeCode}
                              onChange={(e) => handleEmployeeChange(index, "employeeCode", e.target.value)}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              placeholder="Enter employee ID"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`department-${index}`} className="flex items-center text-sm">
                              <Building className="h-4 w-4 mr-1 text-gray-400" />
                              Department
                            </Label>
                            <Input
                              id={`department-${index}`}
                              value={employee.department}
                              onChange={(e) => handleEmployeeChange(index, "department", e.target.value)}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              placeholder="Enter department"
                              required
                            />
                          </div>
                        </div>

                        {/* Display leave balance for selected employee */}
                        {formState.selectedEmployee && (
                          <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-md border border-teal-100 dark:border-teal-800/30">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="text-sm font-medium text-teal-700 dark:text-teal-300">Leave Balance:</div>
                              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                                  <span className="font-medium ml-1">{formState.leaveBalance.total} days</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Used:</span>
                                  <span className="font-medium ml-1">{formState.leaveBalance.used} days</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                                  <span className="font-medium ml-1">{formState.leaveBalance.remaining} days</span>
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
                        className="w-full max-w-md border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-200 text-teal-600 dark:text-teal-400 bg-transparent"
                      >
                        <User className="mr-2 h-4 w-4 text-teal-500" />
                        Add Another Employee
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Leave Details */}
              {formState.currentStep === 2 && (
                <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4 sm:space-y-6">
                  {/* Type of Leave and Supporting Documents - Responsive Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Leave Type */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
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
                        <RadioGroup
                          value={formState.leaveType}
                          onValueChange={(value) => dispatch({ type: "SET_LEAVE_TYPE", payload: value })}
                          className="flex flex-col space-y-2"
                        >
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
                                formState.leaveType === item.value
                                  ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20"
                                  : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                              }`}
                            >
                              <RadioGroupItem value={item.value} id={item.id} />
                              <Label htmlFor={item.id} className="flex items-center cursor-pointer text-sm">
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
                      <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
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
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col space-y-2">
                          {[
                            { id: "medical", label: "Medical Certificate (MC)", icon: "🩺" },
                            { id: "death", label: "Death Certificate", icon: "📜" },
                            { id: "childbirth", label: "Childbirth Certificate", icon: "👶" },
                            { id: "other", label: "Other Documents", icon: "📄" },
                          ].map((item) => (
                            <div key={item.id} className="space-y-2">
                              <div
                                className={`flex items-center space-x-2 p-3 rounded-md border transition-all duration-200 ${
                                  formState.selectedSupportingDocuments.includes(item.label)
                                    ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20"
                                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                                }`}
                              >
                                <Checkbox
                                  id={item.id}
                                  checked={formState.selectedSupportingDocuments.includes(item.label)}
                                  onCheckedChange={() => handleDocTypeChange(item.label)}
                                />
                                <Label htmlFor={item.id} className="flex items-center cursor-pointer text-sm flex-1">
                                  <span className="mr-2">{item.icon}</span>
                                  {item.label}
                                </Label>
                                {formState.selectedSupportingDocuments.includes(item.label) && (
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      isDocumentUploaded(item.label)
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    }`}
                                  >
                                    {isDocumentUploaded(item.label) ? "✓ Uploaded" : "⚠ Required"}
                                  </span>
                                )}
                              </div>

                              <AnimatePresence>
                                {formState.selectedSupportingDocuments.includes(item.label) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="ml-6 space-y-3"
                                  >
                                    {/* Upload Area */}
                                    <div className="border-2 border-dashed border-teal-200 dark:border-teal-700 rounded-lg p-4 bg-teal-50/50 dark:bg-teal-900/10">
                                      {isDocumentUploaded(item.label) ? (
                                        <div className="space-y-3">
                                          {/* Preview of uploaded image */}
                                          <div className="relative">
                                            <Image
                                              src={getUploadedDocumentPreview(item.label) || "/placeholder.svg"}
                                              alt={`Uploaded ${item.label}`}
                                              width={300}
                                              height={200}
                                              className="rounded-md border max-w-full h-auto mx-auto"
                                            />
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => handleRemoveDocument(item.label)}
                                              className="absolute top-2 right-2 h-8 w-8 p-0"
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                                            ✓ Document uploaded successfully
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                          <div className="rounded-full bg-teal-100 dark:bg-teal-900/30 p-3">
                                            <Upload className="h-6 w-6 text-teal-500" />
                                          </div>
                                          <div className="text-center">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                              Upload {item.label}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              PNG, JPG, or PDF up to 5MB
                                            </p>
                                          </div>
                                          <Input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => handleDocumentUpload(item.label, e)}
                                            className="max-w-[200px] text-xs border-slate-300 dark:border-slate-700"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg"
                                    >
                                      <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                          ⚠️ Penting: Serahkan Berkas Asli ke HR
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                          Anda <strong>WAJIB</strong> menyerahkan berkas asli{" "}
                                          <strong>{item.label}</strong> ke bagian HR dalam waktu{" "}
                                          <strong>1x24 jam</strong> setelah pengajuan cuti ini. Kegagalan menyerahkan
                                          berkas asli dapat mengakibatkan pengajuan cuti Anda dibatalkan.
                                        </p>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}

                          {formState.selectedSupportingDocuments.includes("Other Documents") && (
                            <div className="mt-2 pl-8">
                              <Input
                                placeholder="Specify other documents..."
                                className="text-sm border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          )}
                        </div>

                        {formState.selectedSupportingDocuments.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  Document Upload Status
                                </p>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                                  {formState.selectedSupportingDocuments.map((docType) => (
                                    <div key={docType} className="flex items-center gap-2">
                                      {isDocumentUploaded(docType) ? (
                                        <span className="text-green-600 dark:text-green-400">✓</span>
                                      ) : (
                                        <span className="text-red-600 dark:text-red-400">✗</span>
                                      )}
                                      <span>{docType}</span>
                                      {!isDocumentUploaded(docType) && (
                                        <span className="text-red-600 dark:text-red-400 font-medium">
                                          - Upload required
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {formState.selectedSupportingDocuments.some(
                                  (docType) => !isDocumentUploaded(docType),
                                ) && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                                    ⚠️ Semua dokumen yang dipilih harus diupload sebelum melanjutkan ke langkah
                                    berikutnya.
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Period of Leave Application */}
                  <div className="mt-6">
                    <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
                      <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-teal-500" />
                      Period of Leave Application
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                      {supportsManualDates && (
                        <div className="mb-4">
                          <Label className="text-sm font-medium mb-2 block">Date Selection Mode</Label>
                          <Tabs
                            value={formState.dateSelectionMode}
                            onValueChange={(value) =>
                              dispatch({ type: "SET_DATE_SELECTION_MODE", payload: value as DateSelectionMode })
                            }
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900">
                              <TabsTrigger
                                value="range"
                                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Date Range (Consecutive)
                              </TabsTrigger>
                              <TabsTrigger
                                value="manual"
                                className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
                              >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                Manual Dates (Non-consecutive)
                              </TabsTrigger>
                            </TabsList>

                            {/* Range Mode Content */}
                            <TabsContent value="range" className="mt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="startDate" className="flex items-center text-sm">
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
                                  <Input
                                    id="startDate"
                                    type="date"
                                    value={formState.startDate}
                                    onChange={(e) => {
                                      dispatch({
                                        type: "SET_DATES",
                                        payload: { startDate: e.target.value, endDate: formState.endDate },
                                      })
                                    }}
                                    className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                                    required={formState.dateSelectionMode === "range"}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="endDate" className="flex items-center text-sm">
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
                                    value={formState.endDate}
                                    onChange={(e) => {
                                      dispatch({
                                        type: "SET_DATES",
                                        payload: { startDate: formState.startDate, endDate: e.target.value },
                                      })
                                    }}
                                    className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                                    required={formState.dateSelectionMode === "range"}
                                  />
                                </div>

                                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                                  <Label htmlFor="totalDays" className="flex items-center text-sm">
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
                                    value={formState.totalDays}
                                    onChange={(e) => dispatch({ type: "SET_TOTAL_DAYS", payload: e.target.value })}
                                    className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                                    required
                                  />
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="manual" className="mt-4">
                              <div className="space-y-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Manual Date Selection
                                      </p>
                                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        Pilih tanggal-tanggal terpisah untuk cuti yang tidak berurutan. Cocok untuk
                                        karyawan yang ingin mengambil cuti di hari-hari yang berbeda (misal: tanggal 2,
                                        5, 10, 20).
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Date Input */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <div className="flex-1">
                                    <Label htmlFor="manualDateInput" className="flex items-center text-sm mb-2">
                                      <CalendarDays className="h-4 w-4 mr-1 text-gray-400" />
                                      Add Date
                                    </Label>
                                    <div className="flex gap-2">
                                      <Input
                                        id="manualDateInput"
                                        type="date"
                                        value={manualDateInput}
                                        onChange={(e) => setManualDateInput(e.target.value)}
                                        className="flex-1 transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                                      />
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          if (manualDateInput) {
                                            handleAddManualDate(manualDateInput)
                                            setManualDateInput("")
                                          }
                                        }}
                                        className="bg-teal-600 hover:bg-teal-700"
                                        disabled={!manualDateInput}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Selected Dates Display */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">
                                    Selected Dates ({formState.manualDates.length})
                                  </Label>
                                  {formState.manualDates.length === 0 ? (
                                    <div className="p-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg text-center">
                                      <CalendarDays className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No dates selected yet. Add dates using the input above.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border">
                                      <AnimatePresence>
                                        {formState.manualDates.map((date) => (
                                          <motion.div
                                            key={date}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <Badge
                                              variant="secondary"
                                              className="flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900/50"
                                            >
                                              <Calendar className="h-3 w-3" />
                                              {new Date(date).toLocaleDateString("id-ID", {
                                                weekday: "short",
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                              })}
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveManualDate(date)}
                                                className="ml-1 hover:text-red-500 transition-colors"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </Badge>
                                          </motion.div>
                                        ))}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>

                                {/* Total Days Display */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="flex items-center text-sm">
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
                                      Total Leave Days (Business Days)
                                    </Label>
                                    <Input
                                      value={formState.totalDays}
                                      readOnly
                                      className="bg-gray-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="flex items-center text-sm">
                                      <CalendarDays className="h-4 w-4 mr-1 text-gray-400" />
                                      Total Dates Selected
                                    </Label>
                                    <Input
                                      value={formState.manualDates.length.toString()}
                                      readOnly
                                      className="bg-gray-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                    />
                                  </div>
                                </div>

                                {/* Clear All Button */}
                                {formState.manualDates.length > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => dispatch({ type: "SET_MANUAL_DATES", payload: [] })}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear All Dates
                                  </Button>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}

                      {/* Original date range UI for non-Annual Leave types */}
                      {!supportsManualDates && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDate" className="flex items-center text-sm">
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
                            <Input
                              id="startDate"
                              type="date"
                              value={formState.startDate}
                              onChange={(e) => {
                                dispatch({
                                  type: "SET_DATES",
                                  payload: { startDate: e.target.value, endDate: formState.endDate },
                                })
                              }}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="endDate" className="flex items-center text-sm">
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
                              value={formState.endDate}
                              onChange={(e) => {
                                dispatch({
                                  type: "SET_DATES",
                                  payload: { startDate: formState.startDate, endDate: e.target.value },
                                })
                              }}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              required
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                            <Label htmlFor="totalDays" className="flex items-center text-sm">
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
                              value={formState.totalDays}
                              onChange={(e) => dispatch({ type: "SET_TOTAL_DAYS", payload: e.target.value })}
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {/* Half-Day and Early Leave Options */}
                      <div className="mt-4 space-y-4">
                        <div>
                          <Label htmlFor="saturdayOption" className="flex items-center mb-2 text-sm">
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
                            Saturday Work Day
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="includeSaturday"
                              checked={formState.includeSaturday}
                              onCheckedChange={(checked) => {
                                dispatch({
                                  type: "SET_INCLUDE_SATURDAY",
                                  payload: checked === true,
                                })
                              }}
                            />
                            <Label htmlFor="includeSaturday" className="cursor-pointer text-sm">
                              Include Saturday as a work day in leave calculation
                            </Label>
                          </div>
                        </div>

                        {/* Half-Day Option */}
                        <div>
                          <Label htmlFor="halfDayOption" className="flex items-center mb-2 text-sm">
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
                          {formState.leaveType !== "Annual Leave" ? (
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="isHalfDay"
                                  checked={formState.isHalfDay}
                                  onCheckedChange={(checked) => {
                                    dispatch({
                                      type: "SET_HALF_DAY",
                                      payload: { isHalfDay: checked === true },
                                    })
                                    if (checked === true) {
                                      dispatch({
                                        type: "SET_EARLY_LEAVE",
                                        payload: { isEarlyLeave: false },
                                      })
                                    }
                                  }}
                                />
                                <Label htmlFor="isHalfDay" className="cursor-pointer text-sm">
                                  Enable half-day leave
                                </Label>
                              </div>

                              {formState.isHalfDay && (
                                <RadioGroup
                                  value={formState.halfDayPeriod}
                                  onValueChange={(value) =>
                                    dispatch({
                                      type: "SET_HALF_DAY",
                                      payload: { isHalfDay: true, halfDayPeriod: value },
                                    })
                                  }
                                  className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="morning" id="morning" />
                                    <Label htmlFor="morning" className="cursor-pointer text-sm">
                                      Morning
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="afternoon" id="afternoon" />
                                    <Label htmlFor="afternoon" className="cursor-pointer text-sm">
                                      Afternoon
                                    </Label>
                                  </div>
                                </RadioGroup>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-md border border-gray-200 dark:border-slate-700">
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Half-day option is not available for Annual Leave requests.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Early Leave Option */}
                        <div>
                          <Label htmlFor="earlyLeaveOption" className="flex items-center mb-2 text-sm">
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
                          {formState.leaveType !== "Annual Leave" ? (
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="isEarlyLeave"
                                  checked={formState.isEarlyLeave}
                                  onCheckedChange={(checked) => {
                                    dispatch({
                                      type: "SET_EARLY_LEAVE",
                                      payload: { isEarlyLeave: checked === true },
                                    })
                                    if (checked === true) {
                                      dispatch({
                                        type: "SET_HALF_DAY",
                                        payload: { isHalfDay: false },
                                      })
                                      if (formState.startDate) {
                                        dispatch({
                                          type: "SET_DATES",
                                          payload: { startDate: formState.startDate, endDate: formState.startDate },
                                        })
                                      }
                                    }
                                  }}
                                />
                                <Label htmlFor="isEarlyLeave" className="cursor-pointer text-sm">
                                  Request early leave
                                </Label>
                              </div>

                              {formState.isEarlyLeave && (
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor="earlyLeaveTime" className="whitespace-nowrap text-sm">
                                    Leave at:
                                  </Label>
                                  <Input
                                    id="earlyLeaveTime"
                                    type="time"
                                    value={formState.earlyLeaveTime}
                                    onChange={(e) =>
                                      dispatch({
                                        type: "SET_EARLY_LEAVE",
                                        payload: { isEarlyLeave: true, earlyLeaveTime: e.target.value },
                                      })
                                    }
                                    className="w-32 border-slate-300 dark:border-slate-700"
                                    required={formState.isEarlyLeave}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-md border border-gray-200 dark:border-slate-700">
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Early leave option is not available for Annual Leave requests.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date Summary - Updated to handle manual dates */}
                      {((formState.dateSelectionMode === "range" && formState.startDate && formState.endDate) ||
                        (formState.dateSelectionMode === "manual" && formState.manualDates.length > 0)) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md"
                        >
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5" />
                            {formState.dateSelectionMode === "manual" ? (
                              <div className="text-sm text-teal-700 dark:text-teal-300">
                                <p>
                                  Your leave will be on{" "}
                                  <span className="font-medium">{formState.manualDates.length} selected dates</span>:
                                </p>
                                <ul className="mt-2 space-y-1 text-xs">
                                  {formState.manualDates.map((date) => (
                                    <li key={date}>
                                      •{" "}
                                      {new Date(date).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-2">
                                  Total: <span className="font-medium">{formState.totalDays} business days</span>
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-teal-700 dark:text-teal-300">
                                Your leave will be from{" "}
                                <span className="font-medium">
                                  {new Date(formState.startDate).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>{" "}
                                to{" "}
                                <span className="font-medium">
                                  {new Date(formState.endDate).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                                , for a total of <span className="font-medium">{formState.totalDays} days</span>.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Holiday Warning */}
                      {formState.leaveDateConflicts.holidays.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-md"
                        >
                          <div className="flex items-start">
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
                              className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5"
                            >
                              <path d="M8 2v4" />
                              <path d="M16 2v4" />
                              <rect width="18" height="18" x="3" y="4" rx="2" />
                              <path d="M3 10h18" />
                              <path d="M10 16h4" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                Your leave request includes {formState.leaveDateConflicts.holidays.length} public
                                holiday
                                {formState.leaveDateConflicts.holidays.length > 1 ? "s" : ""}:
                              </p>
                              <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 list-disc list-inside">
                                {formState.leaveDateConflicts.holidays.map((holiday: Holiday, index: number) => (
                                  <li key={index}>
                                    {new Date(holiday.date).toLocaleDateString()} - {holiday.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Weekend Warning */}
                      {formState.leaveDateConflicts.includesWeekends && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md"
                        >
                          <div className="flex items-start">
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
                              className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0 mt-0.5"
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
                              <strong>Note:</strong> Your leave request includes weekend days. Company policy may vary
                              on how these are counted.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Saturday Checkbox */}
                      <div className="mt-4">
                        <Label htmlFor="includeSaturday2" className="flex items-center">
                          <Checkbox
                            id="includeSaturday2"
                            checked={formState.includeSaturday}
                            onCheckedChange={(checked) =>
                              dispatch({ type: "SET_INCLUDE_SATURDAY", payload: checked === true })
                            }
                            className="mr-2"
                          />
                          Include Saturday in leave days calculation
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Annual Leave Information - Only show for Annual Leave */}
                  {formState.leaveType === "Annual Leave" && (
                    <div className="mt-6">
                      <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
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
                        Leave Information
                      </h3>
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="cutiTersedia"
                              className="text-sm text-teal-600 dark:text-teal-400 font-medium"
                            >
                              Available Leave
                            </Label>
                            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-md">
                              <Input
                                id="cutiTersedia"
                                type="number"
                                value={formState.leaveBalance.total}
                                onChange={(e) => {
                                  const value = Number.parseInt(e.target.value) || 0
                                  const daysToTake = formState.isHalfDay ? 0.5 : Number(formState.totalDays) || 0
                                  dispatch({
                                    type: "SET_LEAVE_BALANCE",
                                    payload: {
                                      total: value,
                                      used: formState.leaveBalance.used,
                                      remaining: value - daysToTake,
                                    },
                                  })
                                }}
                                className="text-center text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-300 border-0 bg-transparent focus:ring-0 p-0 h-auto"
                              />
                              <p className="text-xs text-teal-500 dark:text-teal-400 text-center mt-1">days</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="cutiDiambil"
                              className="text-sm text-amber-600 dark:text-amber-400 font-medium"
                            >
                              Days Requested
                            </Label>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                              <Input
                                id="cutiDiambil"
                                type="number"
                                value={formState.isHalfDay ? 0.5 : Number(formState.totalDays) || 0}
                                readOnly
                                className="text-center text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300 border-0 bg-transparent focus:ring-0 p-0 h-auto"
                              />
                              <p className="text-xs text-amber-500 dark:text-amber-400 text-center mt-1">days</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="sisaCuti"
                              className="text-sm text-green-600 dark:text-green-400 font-medium"
                            >
                              Remaining Leave
                            </Label>
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                              <Input
                                id="sisaCuti"
                                type="number"
                                value={formState.leaveBalance.remaining}
                                readOnly
                                className="text-center text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300 border-0 bg-transparent focus:ring-0 p-0 h-auto"
                              />
                              <p className="text-xs text-green-500 dark:text-green-400 text-center mt-1">days</p>
                            </div>
                          </div>
                        </div>

                        {formState.totalDays && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0" />
                                <p className="text-sm text-teal-700 dark:text-teal-300">
                                  You are requesting <span className="font-medium">{formState.totalDays} days</span> of
                                  annual leave.
                                </p>
                              </div>
                              <div
                                className={
                                  formState.leaveBalance.remaining < 0
                                    ? "text-sm font-medium text-red-600 dark:text-red-400"
                                    : "text-sm font-medium text-green-600 dark:text-green-400"
                                }
                              >
                                {formState.leaveBalance.remaining} days remaining after this request
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reason for Leave */}
                  <div className="mt-6">
                    <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
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
                      <textarea
                        id="reason"
                        value={formState.reason}
                        onChange={(e) => dispatch({ type: "SET_REASON", payload: e.target.value })}
                        rows={3}
                        placeholder="Please provide detailed reasons for your leave request..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-800 dark:text-white resize-none transition-all duration-200"
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Please provide clear and detailed information about your leave request to help with the approval
                        process.
                      </p>
                    </div>
                  </div>

                  {/* Backup Person */}
                  <div className="mt-6">
                    <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
                      <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-teal-500" />
                      Backup Person / Pengganti
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-md border shadow-sm hover:shadow-md transition-all duration-300">
                      <Input
                        id="backupPerson"
                        value={formState.backupPerson}
                        onChange={(e) => dispatch({ type: "SET_BACKUP_PERSON", payload: e.target.value })}
                        placeholder="Enter the name of the person who will cover your responsibilities..."
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Please specify who will handle your responsibilities during your leave period.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Signature */}
              {formState.currentStep === 3 && (
                <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium flex items-center mb-3">
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
                      <Tabs
                        defaultValue="draw"
                        value={formState.signatureMethod}
                        onValueChange={(value) => dispatch({ type: "SET_SIGNATURE_METHOD", payload: value })}
                        className="w-full"
                      >
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
                                className: "w-full h-48 border rounded-md bg-white",
                              }}
                              backgroundColor="white"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={clearSignature}
                            className="transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 border-slate-300 dark:border-slate-700 bg-transparent"
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
                          <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-white dark:bg-slate-900 min-h-[200px]">
                            {formState.uploadedSignature ? (
                              <motion.div
                                className="flex flex-col items-center"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Image
                                  src={formState.uploadedSignature || "/placeholder.svg"}
                                  alt="Uploaded Signature"
                                  width={300}
                                  height={150}
                                  className="mb-4 border max-w-full h-auto"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => dispatch({ type: "SET_UPLOADED_SIGNATURE", payload: null })}
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
                                <p className="text-sm text-muted-foreground mb-4 text-center">
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

                  {/* Summary - Updated to handle manual dates */}
                  <motion.div
                    className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md p-4 space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="font-medium text-teal-800 dark:text-teal-300">Request Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Leave Type:</span> {formState.leaveType}
                      </div>
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Total Days:</span>{" "}
                        {formState.isHalfDay
                          ? "0.5 (Half Day - " + formState.halfDayPeriod + ")"
                          : formState.isEarlyLeave
                            ? "1 (Early Leave at " + formState.earlyLeaveTime + ")"
                            : formState.totalDays || "Not specified"}
                      </div>
                      {formState.dateSelectionMode === "manual" ? (
                        <>
                          <div className="sm:col-span-2">
                            <span className="text-teal-600 dark:text-teal-400">Date Selection:</span> Manual
                            (Non-consecutive dates)
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-teal-600 dark:text-teal-400">Selected Dates:</span>{" "}
                            {formState.manualDates.length > 0
                              ? formState.manualDates.map((d) => new Date(d).toLocaleDateString()).join(", ")
                              : "Not specified"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-teal-600 dark:text-teal-400">Start Date:</span>{" "}
                            {formState.startDate ? new Date(formState.startDate).toLocaleDateString() : "Not specified"}
                          </div>
                          <div>
                            <span className="text-teal-600 dark:text-teal-400">End Date:</span>{" "}
                            {formState.endDate ? new Date(formState.endDate).toLocaleDateString() : "Not specified"}
                          </div>
                        </>
                      )}
                      <div className="sm:col-span-2">
                        <span className="text-teal-600 dark:text-teal-400">Employees:</span>{" "}
                        {formState.employees.map((e) => e.name).join(", ")}
                      </div>
                      {formState.backupPerson && (
                        <div className="sm:col-span-2">
                          <span className="text-teal-600 dark:text-teal-400">Backup Person:</span>{" "}
                          {formState.backupPerson}
                        </div>
                      )}
                      {formState.selectedSupportingDocuments.length > 0 && (
                        <div className="sm:col-span-2">
                          <span className="text-teal-600 dark:text-teal-400">Supporting Documents:</span>{" "}
                          {formState.selectedSupportingDocuments.join(", ")}
                        </div>
                      )}
                      {formState.selectedEmployee && (
                        <div className="sm:col-span-2">
                          <span className="text-teal-600 dark:text-teal-400">Remaining Leave After Request:</span>{" "}
                          <span
                            className={
                              formState.leaveBalance.remaining < 0
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-green-600 dark:text-green-400 font-medium"
                            }
                          >
                            {formState.leaveBalance.remaining} days
                          </span>
                          {formState.leaveBalance.remaining < 0 && (
                            <span className="text-red-600 dark:text-red-400 ml-1">(Insufficient balance)</span>
                          )}
                        </div>
                      )}
                      <div className="sm:col-span-2 mt-2 text-gray-600 dark:text-gray-400 text-xs">
                        <AlertCircle className="h-4 w-4 inline-block mr-1 text-teal-500" />
                        Leave balance will be updated when your request is approved by management.
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </CardContent>

            {/* Footer with navigation buttons */}
            <div className="flex flex-col sm:flex-row justify-between border-t pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 gap-4 sm:gap-0">
              <div className="flex flex-col sm:flex-row gap-2">
                {formState.currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="group border-slate-300 dark:border-slate-700 order-2 sm:order-1 bg-transparent"
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
                    className="border-slate-300 dark:border-slate-700 order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                )}

                <Button type="button" variant="secondary" onClick={saveDraft} className="relative order-1 sm:order-2">
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
                  {formState.draftSaved && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </Button>
              </div>

              {formState.currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="group bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 order-3"
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
                  disabled={formState.isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 order-3"
                >
                  {formState.isSubmitting ? (
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
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
