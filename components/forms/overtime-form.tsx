"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Upload,
  Trash2,
  Calendar,
  User,
  Briefcase,
  Building,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OvertimeFormProps {
  user: any
}

export default function OvertimeFormComponent({ user }: OvertimeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // Form state
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [hours, setHours] = useState("")
  const [reason, setReason] = useState("")
  const [signatureMethod, setSignatureMethod] = useState("draw")
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formProgress, setFormProgress] = useState(0)

  // Employee Information
  const [employees, setEmployees] = useState([
    {
      name: user?.name || "",
      position: user?.position || "",
      employeeId: user?.employeeId || "",
      department: user?.department || "",
    },
  ])

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

  // Calculate total hours when times change
  const calculateTotalHours = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}:00`)
      const end = new Date(`2000-01-01T${endTime}:00`)

      // If end time is before start time, assume it's the next day
      let diffMs = end.getTime() - start.getTime()
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000 // Add 24 hours
      }

      const diffHrs = diffMs / (1000 * 60 * 60)
      setHours(diffHrs.toString())
    }
  }

  useEffect(() => {
    if (startTime && endTime) {
      calculateTotalHours()
    }
  }, [startTime, endTime])

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
      // Validate overtime details
      if (!date || !startTime || !endTime || !hours || !reason) {
        toast({
          title: "Missing Information",
          description: "Please fill in all overtime details",
          variant: "destructive",
        })
        return false
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

  // Handle form submission
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

      // Prepare form data
      const formData = {
        type: "overtime",
        formData: {
          employees: employees,
          date,
          startTime,
          endTime,
          hours,
          reason,
        },
        signature,
        supportingDocuments: [],
      }

      // Submit form
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Send email notifications
        try {
          // Get recipients from environment variables
          const hrdEmail = process.env.HRD_EMAIL || "admn.htmf@gmail.com"
          const pmcEmail = process.env.PMC_EMAIL || "yenci1505.htm@gmail.com"

          // Prepare notification data
          const formNumber = data.formNumber || "N/A"

          // Send notification to HRD and PMC
          await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: `${hrdEmail},${pmcEmail}`,
              subject: `New Overtime Request #${formNumber} - ${employees[0].name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 5px;">
                  <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px;">New Overtime Request</h2>
                  <p>A new overtime request has been submitted and requires your review:</p>
                  
                  <div style="background-color: #f0fdfa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Form Number:</strong> ${formNumber}</p>
                    <p><strong>Employee:</strong> ${employees[0].name} (${employees[0].employeeId})</p>
                    <p><strong>Department:</strong> ${employees[0].department}</p>
                    <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${startTime} - ${endTime} (${hours} hours)</p>
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

          console.log("Overtime notification emails sent successfully")
        } catch (emailError) {
          console.error("Error sending email notification:", emailError)
          // Don't block the form submission if email fails
        }

        // Update the success toast message to include notification info
        toast({
          title: "Success",
          description: "Overtime form submitted successfully. Email notifications have been sent to HRD and PMC.",
        })
        router.push("/dashboard")
      } else {
        throw new Error(data.error || "Failed to submit form")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "Failed to submit overtime form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

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
          <CardDescription className="text-lg font-semibold">OVERTIME FORM</CardDescription>

          {/* Progress bar */}
          <div className="w-full mt-6 bg-gray-200 rounded-full h-2.5">
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
              Overtime Details
            </span>
            <span className={currentStep >= 3 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>Signature</span>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Step 1: Employee Information */}
            {currentStep === 1 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center">
                      <User className="mr-2 h-5 w-5 text-teal-500" />
                      Employee Information
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEmployees([
                                ...employees,
                                {
                                  name: "",
                                  position: "",
                                  employeeId: "",
                                  department: "",
                                },
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
                              className="mr-1"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <line x1="19" x2="19" y1="8" y2="14"></line>
                              <line x1="22" x2="16" y1="11" y2="11"></line>
                            </svg>
                            Add Employee
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add another employee to this request</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
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
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Overtime Details */}
            {currentStep === 2 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                {/* Overtime Date and Time */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-teal-500" />
                    Overtime Schedule
                  </h3>
                  <div className="bg-white p-4 rounded-md border shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center">
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
                          Date
                        </Label>
                        <div className="relative">
                          <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => {
                              setDate(e.target.value)
                            }}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startTime" className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          Start Time
                        </Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value)
                          }}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime" className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          End Time
                        </Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value)
                          }}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours" className="flex items-center">
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
                          Total Hours
                        </Label>
                        <Input
                          id="hours"
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    {date && startTime && endTime && (
                      <motion.div
                        className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md flex items-center"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <AlertCircle className="h-5 w-5 text-teal-500 mr-2 flex-shrink-0" />
                        <p className="text-sm text-teal-700 dark:text-teal-300">
                          Your overtime will be on{" "}
                          <span className="font-medium">
                            {new Date(date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>{" "}
                          from <span className="font-medium">{startTime}</span> to{" "}
                          <span className="font-medium">{endTime}</span>, for a total of{" "}
                          <span className="font-medium">{Number.parseFloat(hours).toFixed(1)} hours</span>.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Reason for Overtime */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center">
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
                      className="mr-2 text-blue-500"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <line x1="9" x2="15" y1="10" y2="10" />
                      <line x1="12" x2="12" y1="7" y2="13" />
                    </svg>
                    Reason for Overtime
                  </h3>
                  <div className="bg-white p-4 rounded-md border shadow-sm">
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Please provide detailed reasons for your overtime request..."
                      className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Please provide clear and detailed information about why overtime is needed to help with the
                      approval process.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Signature */}
            {currentStep === 3 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center">
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
                      className="mr-2 text-blue-500"
                    >
                      <path d="M15 8h.01" />
                      <rect width="16" height="10" x="4" y="4" rx="2" />
                      <path d="M4 14h16" />
                      <path d="m10 20 4-6" />
                      <path d="m14 20-4-6" />
                    </svg>
                    Signature
                  </h3>
                  <div className="bg-white p-4 rounded-md border shadow-sm">
                    <Tabs defaultValue="draw" onValueChange={setSignatureMethod} className="w-full">
                      <TabsList className="mb-4 w-full grid grid-cols-2">
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
                        <div className="border rounded-md p-2 bg-white">
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
                          className="transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
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
                        <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-white">
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
                                className="transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
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
                                className="max-w-xs"
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
                      <span className="text-teal-600 dark:text-teal-400">Date:</span>{" "}
                      {date ? new Date(date).toLocaleDateString() : "Not specified"}
                    </div>
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">Hours:</span>{" "}
                      {hours ? Number.parseFloat(hours).toFixed(1) : "Not specified"}
                    </div>
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">Start Time:</span>{" "}
                      {startTime || "Not specified"}
                    </div>
                    <div>
                      <span className="text-teal-600 dark:text-teal-400">End Time:</span> {endTime || "Not specified"}
                    </div>
                    <div className="col-span-2">
                      <span className="text-teal-600 dark:text-teal-400">Employees:</span>{" "}
                      {employees.map((e) => e.name).join(", ")}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={handlePrevStep} className="group">
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
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                Cancel
              </Button>
            )}

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
                    Submit Overtime Form
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
