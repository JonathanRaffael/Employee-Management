"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Upload, Trash2 } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"

interface LeaveFormProps {
  user: any
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

  // Employee Information
  const [employees, setEmployees] = useState([{ name: "", position: "", employeeId: "", department: "" }])

  // Supporting documents
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])

  const handleDocTypeChange = (value: string) => {
    if (selectedDocTypes.includes(value)) {
      setSelectedDocTypes(selectedDocTypes.filter((type) => type !== value))
    } else {
      setSelectedDocTypes([...selectedDocTypes, value])
    }
  }

  // Calculate total days when dates change
  const calculateTotalDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setTotalDays(diffDays.toString())
    }
  }

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate dates
      if (new Date(startDate) > new Date(endDate)) {
        toast({
          title: "Invalid Dates",
          description: "Start date cannot be after end date",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Get signature
      const signature = getSignature()
      if (!signature) {
        setIsSubmitting(false)
        return
      }

      // Prepare form data
      const formData = {
        type: "leave",
        formData: {
          employees: employees,
          leaveType,
          startDate,
          endDate,
          totalDays,
          reason,
          supportingDocuments: selectedDocTypes,
        },
        signature,
        supportingDocuments: supportingDocs,
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
        toast({
          title: "Success",
          description: "Leave form submitted successfully",
        })
        router.push("/dashboard")
      } else {
        throw new Error(data.error || "Failed to submit form")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "Failed to submit leave form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/dashboard")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center border-b">
          <div className="flex justify-center mb-2">
            <div className="relative w-16 h-16">
              <Image
                src="/placeholder.svg?height=64&width=64"
                alt="PT HANG TONG MANUFACTORY"
                width={64}
                height={64}
                className="rounded-md"
              />
            </div>
          </div>
          <CardTitle className="text-xl">PT HANG TONG MANUFACTORY</CardTitle>
          <CardDescription className="text-lg font-semibold">LEAVE FORM</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Employee Information */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Employee Information</h3>
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
                >
                  Add Employee
                </Button>
              </div>

              {employees.map((employee, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Employee #{index + 1}</h4>
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`employee-name-${index}`}>Employee Name</Label>
                      <Input
                        id={`employee-name-${index}`}
                        value={employee.name}
                        onChange={(e) => {
                          const newEmployees = [...employees]
                          newEmployees[index].name = e.target.value
                          setEmployees(newEmployees)
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`position-${index}`}>Position</Label>
                      <Input
                        id={`position-${index}`}
                        value={employee.position}
                        onChange={(e) => {
                          const newEmployees = [...employees]
                          newEmployees[index].position = e.target.value
                          setEmployees(newEmployees)
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`employee-id-${index}`}>Employee ID</Label>
                      <Input
                        id={`employee-id-${index}`}
                        value={employee.employeeId}
                        onChange={(e) => {
                          const newEmployees = [...employees]
                          newEmployees[index].employeeId = e.target.value
                          setEmployees(newEmployees)
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`department-${index}`}>Department</Label>
                      <Input
                        id={`department-${index}`}
                        value={employee.department}
                        onChange={(e) => {
                          const newEmployees = [...employees]
                          newEmployees[index].department = e.target.value
                          setEmployees(newEmployees)
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Type */}
            <div className="space-y-2">
              <Label>Type of Leave (please tick appropriate box)</Label>
              <RadioGroup
                value={leaveType}
                onValueChange={setLeaveType}
                className="grid grid-cols-1 md:grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Annual Leave" id="annual" />
                  <Label htmlFor="annual">Annual Leave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Unpaid Leave" id="unpaid" />
                  <Label htmlFor="unpaid">Unpaid Leave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sick Leave" id="sick" />
                  <Label htmlFor="sick">Sick Leave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Bereavement" id="bereavement" />
                  <Label htmlFor="bereavement">Bereavement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Maternity Leave" id="maternity" />
                  <Label htmlFor="maternity">Maternity Leave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Marriage Leave" id="marriage" />
                  <Label htmlFor="marriage">Marriage Leave</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Supporting Documents */}
            <div className="space-y-2">
              <Label>Supporting Documents</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medical"
                    checked={selectedDocTypes.includes("Medical Certificate")}
                    onCheckedChange={() => handleDocTypeChange("Medical Certificate")}
                  />
                  <Label htmlFor="medical">Medical Certificate (MC)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="death"
                    checked={selectedDocTypes.includes("Death Certificate")}
                    onCheckedChange={() => handleDocTypeChange("Death Certificate")}
                  />
                  <Label htmlFor="death">Death Certificate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="childbirth"
                    checked={selectedDocTypes.includes("Childbirth Certificate")}
                    onCheckedChange={() => handleDocTypeChange("Childbirth Certificate")}
                  />
                  <Label htmlFor="childbirth">Childbirth Certificate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="other"
                    checked={selectedDocTypes.includes("Other Documents")}
                    onCheckedChange={() => handleDocTypeChange("Other Documents")}
                  />
                  <Label htmlFor="other">Other Documents</Label>
                </div>
              </div>
            </div>

            {/* Period of Leave Application */}
            <div className="space-y-4">
              <Label>Period of Leave Application</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      if (endDate) calculateTotalDays()
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      if (startDate) calculateTotalDays()
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalDays">Total Leave Days</Label>
                  <Input id="totalDays" value={totalDays} onChange={(e) => setTotalDays(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Reason for Leave */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reasons</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
            </div>

            {/* Signature */}
            <div className="space-y-4">
              <Label>Signature</Label>
              <Tabs defaultValue="draw" onValueChange={setSignatureMethod}>
                <TabsList className="mb-4">
                  <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                  <TabsTrigger value="upload">Upload Signature</TabsTrigger>
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
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={clearSignature}>
                    Clear Signature
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-white">
                    {uploadedSignature ? (
                      <div className="flex flex-col items-center">
                        <Image
                          src={uploadedSignature || "/placeholder.svg"}
                          alt="Uploaded Signature"
                          width={300}
                          height={150}
                          className="mb-4 border"
                        />
                        <Button type="button" variant="outline" onClick={() => setUploadedSignature(null)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Signature
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">Upload your signature image (PNG or JPG)</p>
                        <Input
                          id="signature-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="max-w-xs"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Leave Form"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
