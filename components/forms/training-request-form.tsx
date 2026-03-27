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
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Loader2,
  BookOpen,
  FileCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { motion } from "framer-motion"

interface TrainingRequestFormData {
  // Section A - Employee Information
  fullName: string
  employeeId: string
  department: string
  position: string
  contactInformation: string

  // Section B - Training Details
  trainingTitle: string
  trainingProvider: string
  trainingDateFrom: string
  trainingDateTo: string
  trainingLocation: string
  trainingMode: "online" | "inPerson" | "hybrid"
  trainingDuration: string
  accommodationRequired: boolean
  dateOfCheckIn: string
  numberOfNights: string
  preferredAccommodation: string
  trainingObjectives: string

  // Section C - Approvals
  employeeStatus: "staff" | "nonStaff"
  employeeSignature: string
  supervisorName: string
  managersName: string

  // Section D - HR/Admin Department
  trainingRequestStatus: "approved" | "pending" | "denied"
  hrComments: string
}

const initialFormData: TrainingRequestFormData = {
  fullName: "",
  employeeId: "",
  department: "",
  position: "",
  contactInformation: "",
  trainingTitle: "",
  trainingProvider: "",
  trainingDateFrom: "",
  trainingDateTo: "",
  trainingLocation: "",
  trainingMode: "inPerson",
  trainingDuration: "",
  accommodationRequired: false,
  dateOfCheckIn: "",
  numberOfNights: "",
  preferredAccommodation: "",
  trainingObjectives: "",
  employeeStatus: "staff",
  employeeSignature: "",
  supervisorName: "",
  managersName: "",
  trainingRequestStatus: "pending",
  hrComments: "",
}

interface TrainingRequestFormProps {
  user?: any
  onClose?: () => void
}

export default function TrainingRequestFormComponent({ user, onClose }: TrainingRequestFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // Form state
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<TrainingRequestFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formProgress, setFormProgress] = useState(0)

  const [signatureMethod, setSignatureMethod] = useState("draw")
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)

  useEffect(() => {
    if (currentStep === 1) {
      setFormProgress(25)
    } else if (currentStep === 2) {
      setFormProgress(50)
    } else if (currentStep === 3) {
      setFormProgress(75)
    } else {
      setFormProgress(100)
    }
  }, [currentStep])

  const updateFormData = (field: keyof TrainingRequestFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = () => {
    if (currentStep === 1) {
      if (
        !formData.fullName ||
        !formData.employeeId ||
        !formData.department ||
        !formData.position ||
        !formData.contactInformation
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill in all employee information fields",
          variant: "destructive",
        })
        return false
      }
      return true
    } else if (currentStep === 2) {
      if (
        !formData.trainingTitle ||
        !formData.trainingProvider ||
        !formData.trainingDateFrom ||
        !formData.trainingDateTo ||
        !formData.trainingLocation ||
        !formData.trainingDuration ||
        !formData.trainingObjectives
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill in all training details",
          variant: "destructive",
        })
        return false
      }
      return true
    } else if (currentStep === 3) {
      if (!formData.supervisorName || !formData.managersName) {
        toast({
          title: "Missing Information",
          description: "Please fill in supervisor and manager names",
          variant: "destructive",
        })
        return false
      }
      return true
    }
    return true
  }

  const handleNextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
  }

  const getSignature = () => {
    if (signatureMethod === "draw" && signatureRef.current) {
      const canvas = signatureRef.current.getCanvas()
      const context = canvas.getContext("2d")

      if (!context) {
        return null
      }

      const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
      const hasSignature = pixelBuffer.some((color) => color !== 0xffffffff && color !== 0x00000000)

      if (!hasSignature) {
        return null
      }
      return signatureRef.current.toDataURL()
    } else if (signatureMethod === "upload") {
      if (!uploadedSignature) {
        return null
      }
      return uploadedSignature
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep()) {
      return
    }

    setIsSubmitting(true)

    try {
      const signature = getSignature()
      if (!signature) {
        toast({
          title: "Signature Required",
          description: "Please provide your signature before submitting",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const submissionData = {
        type: "training-request",
        data: {
          // Map form fields to expected structure
          fullName: formData.fullName,
          employeeCode: formData.employeeId,
          departmentName: formData.department,
          position: formData.position,
          contactInfo: formData.contactInformation,
          trainingTitle: formData.trainingTitle,
          trainingProvider: formData.trainingProvider,
          startDate: formData.trainingDateFrom,
          endDate: formData.trainingDateTo,
          trainingLocation: formData.trainingLocation,
          trainingMode: formData.trainingMode,
          trainingDuration: formData.trainingDuration,
          accommodationRequired: formData.accommodationRequired,
          checkInDate: formData.dateOfCheckIn,
          nights: formData.numberOfNights,
          preferredAccommodation: formData.preferredAccommodation,
          trainingObjectives: formData.trainingObjectives,
          employeeCategory: formData.employeeStatus,
          supervisorName: formData.supervisorName,
          managersName: formData.managersName,
          trainingRequestStatus: formData.trainingRequestStatus,
          hrComments: formData.hrComments,
        },
        signature: signature,
        supportingDocuments: [],
      }

      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Training request form submitted successfully. Form ID: ${data.form?.id || "N/A"}`,
        })
        if (onClose) {
          onClose()
        } else {
          router.push("/dashboard")
        }
      } else {
        throw new Error(data.error || "Failed to submit form")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit training request form",
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
      {!onClose && (
        <Button variant="ghost" className="mb-4 group" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="group-hover:underline">Back to Dashboard</span>
        </Button>
      )}

      <Card className="max-w-4xl mx-auto border-gray-200 shadow-sm border-l-4 border-l-teal-500 dark:border-l-teal-400 overflow-hidden">
        <CardHeader className="text-center border-b bg-gradient-to-r from-teal-50 to-white dark:from-slate-800 dark:to-slate-800/80">
          <div className="flex justify-center mb-2">
            <div className="relative w-16 h-16">
              <Image
                src="/images/logo-cropped.png"
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
          <CardDescription className="text-lg font-semibold">TRAINING REQUEST FORM</CardDescription>

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
              Training Details
            </span>
            <span className={currentStep >= 3 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>Approvals</span>
            <span className={currentStep >= 4 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>Signature</span>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Step 1: Employee Information */}
            {currentStep === 1 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <User className="mr-2 h-5 w-5 text-teal-500" />
                    Employee Information
                  </h3>

                  <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="flex items-center">
                          <User className="h-4 w-4 mr-1 text-gray-400" />
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => updateFormData("fullName", e.target.value)}
                          placeholder="Enter full name"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employeeId" className="flex items-center">
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
                          Employee ID *
                        </Label>
                        <Input
                          id="employeeId"
                          value={formData.employeeId}
                          onChange={(e) => updateFormData("employeeId", e.target.value)}
                          placeholder="Enter employee ID"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department" className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-gray-400" />
                          Department *
                        </Label>
                        <Select
                          value={formData.department}
                          onValueChange={(value) => updateFormData("department", value)}
                        >
                          <SelectTrigger className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IT">IT Department</SelectItem>
                            <SelectItem value="HR">HR Department</SelectItem>
                            <SelectItem value="Finance">Finance Department</SelectItem>
                            <SelectItem value="Operations">Operations Department</SelectItem>
                            <SelectItem value="Marketing">Marketing Department</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position" className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                          Position *
                        </Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => updateFormData("position", e.target.value)}
                          placeholder="Enter position"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactInformation">Contact Information *</Label>
                      <Input
                        id="contactInformation"
                        value={formData.contactInformation}
                        onChange={(e) => updateFormData("contactInformation", e.target.value)}
                        placeholder="Phone number, email, etc."
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Training Details */}
            {currentStep === 2 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <BookOpen className="mr-2 h-5 w-5 text-teal-500" />
                    Training Details
                  </h3>

                  <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trainingTitle">Training Title *</Label>
                        <Input
                          id="trainingTitle"
                          value={formData.trainingTitle}
                          onChange={(e) => updateFormData("trainingTitle", e.target.value)}
                          placeholder="Enter training title"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trainingProvider">Training Provider *</Label>
                        <Input
                          id="trainingProvider"
                          value={formData.trainingProvider}
                          onChange={(e) => updateFormData("trainingProvider", e.target.value)}
                          placeholder="Enter training provider"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trainingDateFrom" className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          Training Date From *
                        </Label>
                        <Input
                          id="trainingDateFrom"
                          type="date"
                          value={formData.trainingDateFrom}
                          onChange={(e) => updateFormData("trainingDateFrom", e.target.value)}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trainingDateTo" className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          Training Date To *
                        </Label>
                        <Input
                          id="trainingDateTo"
                          type="date"
                          value={formData.trainingDateTo}
                          onChange={(e) => updateFormData("trainingDateTo", e.target.value)}
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trainingLocation">Training Location *</Label>
                        <Input
                          id="trainingLocation"
                          value={formData.trainingLocation}
                          onChange={(e) => updateFormData("trainingLocation", e.target.value)}
                          placeholder="Enter training location"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trainingMode">Training Mode *</Label>
                        <Select
                          value={formData.trainingMode}
                          onValueChange={(value: "online" | "inPerson" | "hybrid") =>
                            updateFormData("trainingMode", value)
                          }
                        >
                          <SelectTrigger className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder="Select training mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="inPerson">In-Person</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainingDuration">Training Duration *</Label>
                      <Input
                        id="trainingDuration"
                        value={formData.trainingDuration}
                        onChange={(e) => updateFormData("trainingDuration", e.target.value)}
                        placeholder="e.g. 3 days, 2 weeks"
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="accommodationRequired"
                          checked={formData.accommodationRequired}
                          onCheckedChange={(checked) => updateFormData("accommodationRequired", checked as boolean)}
                        />
                        <Label htmlFor="accommodationRequired">Accommodation Required</Label>
                      </div>

                      {formData.accommodationRequired && (
                        <motion.div
                          className="ml-6 space-y-4"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="dateOfCheckIn">Date of Check In</Label>
                              <Input
                                id="dateOfCheckIn"
                                type="date"
                                value={formData.dateOfCheckIn}
                                onChange={(e) => updateFormData("dateOfCheckIn", e.target.value)}
                                className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="numberOfNights">No. of Nights</Label>
                              <Input
                                id="numberOfNights"
                                type="number"
                                value={formData.numberOfNights}
                                onChange={(e) => updateFormData("numberOfNights", e.target.value)}
                                placeholder="0"
                                className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preferredAccommodation">Preferred Accommodation</Label>
                            <Input
                              id="preferredAccommodation"
                              value={formData.preferredAccommodation}
                              onChange={(e) => updateFormData("preferredAccommodation", e.target.value)}
                              placeholder="Hotel preference, room type, etc."
                              className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainingObjectives">Training Objectives *</Label>
                      <Textarea
                        id="trainingObjectives"
                        value={formData.trainingObjectives}
                        onChange={(e) => updateFormData("trainingObjectives", e.target.value)}
                        placeholder="Explain the training objectives..."
                        rows={4}
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Approvals */}
            {currentStep === 3 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <FileCheck className="mr-2 h-5 w-5 text-teal-500" />
                    Approvals
                  </h3>

                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md p-4">
                    <h4 className="font-medium text-teal-800 dark:text-teal-300 mb-2">Section C - Approvals</h4>
                    <p className="text-sm text-teal-700 dark:text-teal-300">
                      Please check all details are correct before signing
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Employee Status *</Label>
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="staff"
                            checked={formData.employeeStatus === "staff"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("employeeStatus", "staff")
                            }}
                          />
                          <Label htmlFor="staff">Staff</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="nonStaff"
                            checked={formData.employeeStatus === "nonStaff"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("employeeStatus", "nonStaff")
                            }}
                          />
                          <Label htmlFor="nonStaff">Non Staff</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supervisorName" className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        Supervisor Name *
                      </Label>
                      <Input
                        id="supervisorName"
                        value={formData.supervisorName}
                        onChange={(e) => updateFormData("supervisorName", e.target.value)}
                        placeholder="Enter supervisor name"
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="managersName" className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        Manager's Name *
                      </Label>
                      <Input
                        id="managersName"
                        value={formData.managersName}
                        onChange={(e) => updateFormData("managersName", e.target.value)}
                        placeholder="Enter manager's name"
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-md p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Section D - HR/Admin Department
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This section will be filled by HR Department
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-md border shadow-sm">
                    <div className="space-y-2">
                      <Label htmlFor="hrComments">HR Comments</Label>
                      <Textarea
                        id="hrComments"
                        value={formData.hrComments}
                        onChange={(e) => updateFormData("hrComments", e.target.value)}
                        placeholder="HR comments and remarks..."
                        rows={3}
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Signature */}
            {currentStep === 4 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5 text-teal-500" />
                    Signature
                  </h3>

                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md p-4">
                    <h4 className="font-medium text-teal-800 dark:text-teal-300 mb-2">Leader Signature Required</h4>
                    <p className="text-sm text-teal-700 dark:text-teal-300">
                      Please provide your signature to authorize this training request
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-md border shadow-sm">
                    <Tabs defaultValue="draw" onValueChange={setSignatureMethod} className="w-full">
                      <TabsList className="mb-4 w-full grid grid-cols-2">
                        <TabsTrigger
                          value="draw"
                          className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 transition-all duration-200"
                        >
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
                          className="transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 bg-transparent"
                        >
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

                  {/* Summary */}
                  <motion.div
                    className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md p-4 space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="font-medium text-teal-800 dark:text-teal-300">Request Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Employee:</span>{" "}
                        {formData.fullName || "Not specified"}
                      </div>
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Training:</span>{" "}
                        {formData.trainingTitle || "Not specified"}
                      </div>
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Dates:</span>{" "}
                        {formData.trainingDateFrom && formData.trainingDateTo
                          ? `${new Date(formData.trainingDateFrom).toLocaleDateString()} - ${new Date(formData.trainingDateTo).toLocaleDateString()}`
                          : "Not specified"}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
            {currentStep < 4 && (
              <Button onClick={handleNextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {currentStep === 4 && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Submit
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
