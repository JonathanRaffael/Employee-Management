"use client"

import { Input } from "@/components/ui/input"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, CheckCircle, XCircle, Upload, Trash2 } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import FormStatusBadge from "@/components/ui/form-status-badge"

interface FormDetailsProps {
  form: any
  userRole: string
  userId: string
}

export default function FormDetails({ form, userRole, userId }: FormDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // State for approval/rejection
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [comments, setComments] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [signatureMethod, setSignatureMethod] = useState("draw")
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Handle approve form
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get signature
      const signature = getSignature()
      if (!signature) {
        setIsSubmitting(false)
        return
      }

      // Submit approval
      const response = await fetch(`/api/forms/${form.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          comments,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Form approved successfully",
        })
        setIsApproveDialogOpen(false)
        router.refresh()
        router.push("/dashboard")
      } else {
        throw new Error(data.error || "Failed to approve form")
      }
    } catch (error) {
      console.error("Error approving form:", error)
      toast({
        title: "Error",
        description: "Failed to approve form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle reject form
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!rejectionReason) {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for rejection",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Submit rejection
      const response = await fetch(`/api/forms/${form.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectionReason,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Form rejected successfully",
        })
        setIsRejectDialogOpen(false)
        router.refresh()
        router.push("/dashboard")
      } else {
        throw new Error(data.error || "Failed to reject form")
      }
    } catch (error) {
      console.error("Error rejecting form:", error)
      toast({
        title: "Error",
        description: "Failed to reject form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if HRD can approve/reject
  const canApprove = userRole === "hrd" && form.status === "pending"

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/dashboard")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{form.type === "leave" ? "Leave Request" : "Overtime Request"}</CardTitle>
              <CardDescription>Submitted on {formatDate(form.createdAt)}</CardDescription>
            </div>
            <FormStatusBadge status={form.status} />
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Employee Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Employee Information</h3>
            {form.data.employees &&
              form.data.employees.map((employee: any, index: number) => (
                <div key={index} className="mb-4 border rounded-md p-4">
                  <h4 className="font-medium mb-2">Employee #{index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Employee Name</p>
                      <p>{employee.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Position</p>
                      <p>{employee.position || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employee ID</p>
                      <p>{employee.employeeId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p>{employee.department || "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <Separator />

          {/* Form Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Request Details</h3>
            {form.type === "leave" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Leave Type</p>
                  <p>{form.data.leaveType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                  <p>{form.data.totalDays}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p>{formatDate(form.data.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p>{formatDate(form.data.endDate)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p>{form.data.reason}</p>
                </div>
                {form.data.supportingDocuments && form.data.supportingDocuments.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Supporting Documents</p>
                    <ul className="list-disc list-inside">
                      {form.data.supportingDocuments.map((doc: string, index: number) => (
                        <li key={index}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {form.type === "overtime" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p>{formatDate(form.data.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hours</p>
                  <p>{form.data.hours}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p>{form.data.reason}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Approvals */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Approvals</h3>
            <div className="space-y-4">
              {form.approvals.map((approval: any) => (
                <div key={approval.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium capitalize">{approval.role}</p>
                      <p className="text-sm text-muted-foreground">
                        {approval.approver ? approval.approver.name : "Pending"}
                      </p>
                    </div>
                    <FormStatusBadge status={approval.status} />
                  </div>

                  {approval.signature && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Signature</p>
                      <div className="border rounded-md p-2 bg-white">
                        <Image
                          src={approval.signature || "/placeholder.svg"}
                          alt="Signature"
                          width={200}
                          height={100}
                          className="max-h-24"
                        />
                      </div>
                    </div>
                  )}

                  {approval.comments && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-1">Comments</p>
                      <p>{approval.comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        {canApprove && (
          <CardFooter className="border-t pt-6 flex justify-end gap-2">
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleReject}>
                  <DialogHeader>
                    <DialogTitle>Reject Request</DialogTitle>
                    <DialogDescription>Please provide a reason for rejecting this request.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      placeholder="Reason for rejection"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive" disabled={isSubmitting}>
                      {isSubmitting ? "Rejecting..." : "Reject Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleApprove}>
                  <DialogHeader>
                    <DialogTitle>Approve Request</DialogTitle>
                    <DialogDescription>Please sign to approve this request.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <Textarea
                      placeholder="Comments (optional)"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={2}
                    />

                    <div className="space-y-4">
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
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Approving..." : "Approve Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
