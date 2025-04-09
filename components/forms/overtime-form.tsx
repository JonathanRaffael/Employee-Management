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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Upload, Trash2 } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"

interface OvertimeFormProps {
  user: any
}

export default function OvertimeFormComponent({ user }: OvertimeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // Form state
  const [date, setDate] = useState("")
  const [hours, setHours] = useState("")
  const [reason, setReason] = useState("")
  const [signatureMethod, setSignatureMethod] = useState("draw")
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState([
    {
      name: user.name,
      position: user.position || "",
      employeeId: user.employeeId || "",
      department: user.department || "",
    },
  ])

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
        toast({
          title: "Success",
          description: "Overtime form submitted successfully",
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
          <CardDescription className="text-lg font-semibold">OVERTIME FORM</CardDescription>
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

            {/* Overtime Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Reason for Overtime */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Overtime</Label>
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
              {isSubmitting ? "Submitting..." : "Submit Overtime Form"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
