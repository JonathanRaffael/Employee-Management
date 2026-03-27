import { z } from "zod"

export const employeeSchema = z.object({
  name: z.string().min(1, "Employee name is required").max(100),
  position: z.string().min(1, "Position is required").max(100),
  employeeId: z.string().min(1, "Employee ID is required").max(50),
  department: z.string().min(1, "Department is required").max(100),
})

export const leaveFormDataSchema = z.object({
  employees: z.array(employeeSchema).min(1, "At least one employee is required"),
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid start date"),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid end date"),
  totalDays: z.string().refine((days) => {
    const num = Number.parseInt(days)
    return !isNaN(num) && num > 0 && num <= 365
  }, "Total days must be between 1 and 365"),
  reason: z.string().min(1, "Reason is required").max(500),
  supportingDocuments: z.array(z.string().url()).default([]),
  isHalfDay: z.boolean().optional(),
  isEarlyLeave: z.boolean().optional(),
})

export const overtimeFormDataSchema = z.object({
  employee: employeeSchema,
  date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format"),
  hours: z.string().refine((hours) => {
    const num = Number.parseFloat(hours)
    return !isNaN(num) && num > 0 && num <= 24
  }, "Hours must be between 0 and 24"),
  reason: z.string().min(1, "Reason is required").max(500),
  supportingDocuments: z.array(z.string().url()).default([]),
})

export const formSubmissionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("leave"),
    formData: leaveFormDataSchema,
    signature: z.string().min(1, "Signature is required"),
    supportingDocuments: z.array(z.string().url()).default([]),
    jumlahHariCuti: z.number().min(1).max(365).optional(),
  }),
  z.object({
    type: z.literal("overtime"),
    formData: overtimeFormDataSchema,
    signature: z.string().min(1, "Signature is required"),
    supportingDocuments: z.array(z.string().url()).default([]),
  }),
])

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start <= end && start >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Within last year
}

export function validateTimeRange(startTime: string, endTime: string): boolean {
  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  return endMinutes > startMinutes
}
