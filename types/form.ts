/* =========================
   FORM SHARED TYPES
========================= */

export interface Employee {
  /**
   * ID relasi employee (dipakai di FormDetails)
   * Biasanya sama dengan id employee record
   */
  employeeId: string

  /** Primary ID employee */
  id: string

  name: string
  employeeCode: string
  department: string
  position: string
}

export interface Approver {
  id: string
  name: string
  role: string
}

export interface Approval {
  id: string
  role: string
  status: string

  comments?: string
  signature?: string

  createdAt: string
  updatedAt?: string

  approver?: Approver
}

export interface FormData {
  id: string

  /** Nomor form (nullable di DB) */
  formNumber?: number

  /** overtime | leave | training | etc */
  type: string

  status: string
  data: any

  createdAt: string
  updatedAt: string

  employeeSignature?: string
  leaderSignature?: string
  leaderApprovalDate?: string

  hrdSignature?: string
  hrdApprovalDate?: string

  supportingDocuments?: string[]

  employee: Employee
  approvals: Approval[]
}
