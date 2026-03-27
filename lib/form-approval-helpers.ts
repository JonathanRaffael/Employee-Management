/**
 * Form Approval Helper Functions
 * ==============================
 * Frontend mirror of backend approval rules
 * MUST stay aligned with backend
 */

export type FormStatus = "DRAFT" | "PENDING" | "PROCESS" | "APPROVED" | "REJECTED"
export type UserRole = "LEADER" | "HRD" | "SUPERVISOR" | "ADMIN"
export type FormType = "LEAVE" | "OVERTIME"

export interface Approval {
  id: string
  role: string
  status: string
  comments?: string
  signature?: string | null
  approvedAt?: string | null
}

export interface FormDetail {
  id: string
  status: string
  type: string
  approvals: Approval[]
}

/* =========================
   Utilities
========================= */
export const normalize = (v?: string | null) => v?.toUpperCase() ?? ""

export const isFinalStatus = (status: string): boolean =>
  ["APPROVED", "REJECTED"].includes(normalize(status))

export const isLeaderApproved = (approvals: Approval[]): boolean =>
  approvals.some(
    (a) => normalize(a.role) === "LEADER" && normalize(a.status) === "APPROVED"
  )

/* =========================
   APPROVE
========================= */
export const canApprove = (form: FormDetail, userRole: string): boolean => {
  const role = normalize(userRole)
  const status = normalize(form.status)

  if (role !== "HRD") return false
  if (status !== "PENDING") return false
  if (isFinalStatus(status)) return false
  if (!isLeaderApproved(form.approvals)) return false

  return true
}

/* =========================
   REJECT
========================= */
export const canReject = (form: FormDetail, userRole: string): boolean => {
  const role = normalize(userRole)
  const status = normalize(form.status)

  if (isFinalStatus(status)) return false
  if (role === "SUPERVISOR" && normalize(form.type) !== "OVERTIME") return false

  return ["LEADER", "HRD", "SUPERVISOR", "ADMIN"].includes(role)
}

/**
 * Only these roles cause FINAL rejection
 * Must match backend FINAL_REJECT_ROLES
 */
export const isFinalRejecter = (userRole: string): boolean => {
  return ["HRD", "ADMIN"].includes(normalize(userRole))
}

/* =========================
   PROCESS
========================= */
export const canProcess = (form: FormDetail, userRole: string): boolean => {
  const role = normalize(userRole)
  const status = normalize(form.status)

  if (!["DRAFT", "PENDING"].includes(status)) return false
  if (isFinalStatus(status)) return false
  if (role === "SUPERVISOR" && normalize(form.type) !== "OVERTIME") return false

  return ["LEADER", "HRD", "SUPERVISOR", "ADMIN"].includes(role)
}

export const requiresSignatureForProcess = (userRole: string): boolean =>
  normalize(userRole) !== "LEADER"

/* =========================
   EDIT / DELETE
========================= */
export const canEdit = (form: FormDetail, userRole: string): boolean =>
  !isFinalStatus(form.status) && ["ADMIN", "HRD"].includes(normalize(userRole))

export const canDelete = (form: FormDetail, userRole: string): boolean =>
  !isFinalStatus(form.status) && ["ADMIN", "HRD"].includes(normalize(userRole))
