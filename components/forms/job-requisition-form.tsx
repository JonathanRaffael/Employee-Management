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
  Building2,
  Users,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { motion } from "framer-motion"

interface JobRequisitionFormData {
  // Department Head Section
  requestPositionTitle: string
  departmentName: string
  expectedStartDate: string
  skillsRequired: string
  briefExplanation: string

  // Position Details
  positionDuration: "permanent" | "temporary"
  temporaryEndDate?: string
  employmentStatus: "partTime" | "fullTime" | "contract"

  // Requesting Supervisor
  requestedBy: string
  supervisorSignature: string

  // Approving Authority (filled by Operations Manager)
  salaryRange: string
  budgetStatus: "sufficient" | "additional"
  approvedBy: string

  // HR Department
  hrRemarks: string
  verifiedBy: string
}

const initialFormData: JobRequisitionFormData = {
  requestPositionTitle: "",
  departmentName: "",
  expectedStartDate: "",
  skillsRequired: "",
  briefExplanation: "",
  positionDuration: "permanent",
  temporaryEndDate: "",
  employmentStatus: "fullTime",
  requestedBy: "",
  supervisorSignature: "",
  salaryRange: "",
  budgetStatus: "sufficient",
  approvedBy: "",
  hrRemarks: "",
  verifiedBy: "",
}

interface JobRequisitionFormProps {
  user?: any
  onClose?: () => void
}

export default function JobRequisitionFormComponent({ user, onClose }: JobRequisitionFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // Form state
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<JobRequisitionFormData>(initialFormData)
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

  const updateFormData = (field: keyof JobRequisitionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = () => {
    if (currentStep === 1) {
      if (
        !formData.requestPositionTitle ||
        !formData.departmentName ||
        !formData.expectedStartDate ||
        !formData.skillsRequired ||
        !formData.briefExplanation
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required position details",
          variant: "destructive",
        })
        return false
      }
      return true
    } else if (currentStep === 2) {
      if (!formData.requestedBy) {
        toast({
          title: "Missing Information",
          description: "Please fill in all employment terms",
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
        type: "job-requisition",
        data: {
          requestPosition: formData.requestPositionTitle,
          departmentName: formData.departmentName,
          expectedStartDate: formData.expectedStartDate,
          skillsRequired: formData.skillsRequired,
          explanation: formData.briefExplanation,
          positionDuration: formData.positionDuration,
          temporaryEndDate: formData.temporaryEndDate,
          employmentType: formData.employmentStatus,
          requestedBy: formData.requestedBy,
          salaryRange: formData.salaryRange,
          budgetStatus: formData.budgetStatus,
          approvedBy: formData.approvedBy,
          remarks: formData.hrRemarks,
          verifiedBy: formData.verifiedBy,
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
          description: `Job requisition form submitted successfully. Form ID: ${data.form?.id || "N/A"}`,
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
        description: error instanceof Error ? error.message : "Failed to submit job requisition form",
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
          <CardDescription className="text-lg font-semibold">JOB REQUISITION FORM</CardDescription>

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
              Position Details
            </span>
            <span className={currentStep >= 2 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
              Employment Terms
            </span>
            <span className={currentStep >= 3 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>
              Approval Chain
            </span>
            <span className={currentStep >= 4 ? "font-medium text-teal-600 dark:text-teal-400" : ""}>Signature</span>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Step 1: Position Details */}
            {currentStep === 1 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Building2 className="mr-2 h-5 w-5 text-teal-500" />
                    Position Details
                  </h3>

                  <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="requestPositionTitle" className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                          Request Position Title *
                        </Label>
                        <Input
                          id="requestPositionTitle"
                          value={formData.requestPositionTitle}
                          onChange={(e) => updateFormData("requestPositionTitle", e.target.value)}
                          placeholder="e.g. Senior Software Engineer"
                          className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="departmentName" className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-gray-400" />
                          Department Name *
                        </Label>
                        <Select
                          value={formData.departmentName}
                          onValueChange={(value) => updateFormData("departmentName", value)}
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expectedStartDate" className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        Expected Start Date *
                      </Label>
                      <Input
                        id="expectedStartDate"
                        type="date"
                        value={formData.expectedStartDate}
                        onChange={(e) => updateFormData("expectedStartDate", e.target.value)}
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skillsRequired">Skills & Other Qualities Required *</Label>
                      <Textarea
                        id="skillsRequired"
                        value={formData.skillsRequired}
                        onChange={(e) => updateFormData("skillsRequired", e.target.value)}
                        placeholder="List required skills, qualifications, and experience..."
                        rows={4}
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="briefExplanation">State Brief Explanation Why Required *</Label>
                      <Textarea
                        id="briefExplanation"
                        value={formData.briefExplanation}
                        onChange={(e) => updateFormData("briefExplanation", e.target.value)}
                        placeholder="Explain the business need for this position..."
                        rows={3}
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 resize-none border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Employment Terms */}
            {currentStep === 2 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Users className="mr-2 h-5 w-5 text-teal-500" />
                    Employment Terms
                  </h3>

                  <div className="bg-white p-4 rounded-md border shadow-sm space-y-6">
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Position Duration *</Label>
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="permanent"
                            checked={formData.positionDuration === "permanent"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("positionDuration", "permanent")
                            }}
                          />
                          <Label htmlFor="permanent">Permanent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="temporary"
                            checked={formData.positionDuration === "temporary"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("positionDuration", "temporary")
                            }}
                          />
                          <Label htmlFor="temporary">Temporary</Label>
                        </div>
                      </div>

                      {formData.positionDuration === "temporary" && (
                        <motion.div
                          className="space-y-2 ml-6"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                        >
                          <Label htmlFor="temporaryEndDate">If so, end date:</Label>
                          <Input
                            id="temporaryEndDate"
                            type="date"
                            value={formData.temporaryEndDate || ""}
                            onChange={(e) => updateFormData("temporaryEndDate", e.target.value)}
                            className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                          />
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-medium">Status of Employment *</Label>
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="partTime"
                            checked={formData.employmentStatus === "partTime"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("employmentStatus", "partTime")
                            }}
                          />
                          <Label htmlFor="partTime">Part Time</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="fullTime"
                            checked={formData.employmentStatus === "fullTime"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("employmentStatus", "fullTime")
                            }}
                          />
                          <Label htmlFor="fullTime">Full-Time</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="contract"
                            checked={formData.employmentStatus === "contract"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("employmentStatus", "contract")
                            }}
                          />
                          <Label htmlFor="contract">Contract</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="requestedBy" className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        Requested By (Supervisor) *
                      </Label>
                      <Input
                        id="requestedBy"
                        value={formData.requestedBy}
                        onChange={(e) => updateFormData("requestedBy", e.target.value)}
                        placeholder="Supervisor name"
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Approval Chain */}
            {currentStep === 3 && (
              <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-teal-500" />
                    Approval Chain
                  </h3>

                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-md p-4">
                    <h4 className="font-medium text-teal-800 dark:text-teal-300 mb-2">Approving Authority Section</h4>
                    <p className="text-sm text-teal-700 dark:text-teal-300">
                      This section will be filled by the Operations Manager
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="salaryRange">Salary Range</Label>
                      <Input
                        id="salaryRange"
                        value={formData.salaryRange}
                        onChange={(e) => updateFormData("salaryRange", e.target.value)}
                        placeholder="e.g. $50,000 - $70,000"
                        className="transition-all duration-200 focus:border-teal-300 focus:ring-teal-200 border-slate-300 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-medium">Budget Status</Label>
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sufficient"
                            checked={formData.budgetStatus === "sufficient"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("budgetStatus", "sufficient")
                            }}
                          />
                          <Label htmlFor="sufficient">Sufficient Budget</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="additional"
                            checked={formData.budgetStatus === "additional"}
                            onCheckedChange={(checked) => {
                              if (checked) updateFormData("budgetStatus", "additional")
                            }}
                          />
                          <Label htmlFor="additional">Requires Additional Budget</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-md p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">HR Department Section</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This section will be filled by HR Department
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-md border shadow-sm">
                    <div className="space-y-2">
                      <Label htmlFor="hrRemarks">HR Remarks</Label>
                      <Textarea
                        id="hrRemarks"
                        value={formData.hrRemarks}
                        onChange={(e) => updateFormData("hrRemarks", e.target.value)}
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
                      Please provide your signature to authorize this job requisition request
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
                        <span className="text-teal-600 dark:text-teal-400">Position:</span>{" "}
                        {formData.requestPositionTitle || "Not specified"}
                      </div>
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Department:</span>{" "}
                        {formData.departmentName || "Not specified"}
                      </div>
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Start Date:</span>{" "}
                        {formData.expectedStartDate
                          ? new Date(formData.expectedStartDate).toLocaleDateString()
                          : "Not specified"}
                      </div>
                      <div>
                        <span className="text-teal-600 dark:text-teal-400">Duration:</span>{" "}
                        {formData.positionDuration || "Not specified"}
                      </div>
                      <div className="col-span-2">
                        <span className="text-teal-600 dark:text-teal-400">Requested By:</span>{" "}
                        {formData.requestedBy || "Not specified"}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={handlePrevStep} className="group bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                Previous Step
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onClose) {
                    onClose()
                  } else {
                    router.push("/dashboard")
                  }
                }}
              >
                Cancel
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="group bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
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
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Job Requisition
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
