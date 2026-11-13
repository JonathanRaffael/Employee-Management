
"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search,
  Plus,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Power,
  Trash2,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

import DashboardHeader from "@/components/dashboard/dashboard-header"

type LeaveBalance = {
  year: number
  total: number
  used: number
  remaining: number
}

type Employee = {
  id: string
  employeeCode: string
  name: string
  department: string
  position: string
  isActive: boolean
  createdAt?: string
  leave?: LeaveBalance
}

type ToastType = "success" | "error" | "info"

type ToastMessage = {
  id: number
  type: ToastType
  title: string
  message: string
}

type ConfirmAction =
  | { type: "delete"; employee: Employee }
  | { type: "status"; employee: Employee; nextStatus: boolean }

type EmployeeForm = {
  employeeCode: string
  name: string
  department: string
  position: string
  leaveYear: number
  leaveTotal: number
  leaveUsed: number
}

const emptyForm: EmployeeForm = {
  employeeCode: "",
  name: "",
  department: "",
  position: "",
  leaveYear: new Date().getFullYear(),
  leaveTotal: 12,
  leaveUsed: 0,
}

const LIMIT = 10

export default function EmployeeManagementPage() {
  const { data: session } = useSession()

  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    image: session?.user?.image ?? "",
  }

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("all")
  const [status, setStatus] = useState("all")

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEmployees, setTotalEmployees] = useState(0)

  const [activeCount, setActiveCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)

  const [modal, setModal] = useState<"add" | "edit" | "detail" | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState<EmployeeForm>(emptyForm)

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  // =====================================================
  // TOAST NOTIFICATION
  // =====================================================

  const showToast = (
    type: ToastType,
    title: string,
    message: string,
  ) => {
    setToast({
      id: Date.now(),
      type,
      title,
      message,
    })
  }

  useEffect(() => {
    if (!toast) return

    const timeout = setTimeout(() => {
      setToast(null)
    }, 3500)

    return () => clearTimeout(timeout)
  }, [toast])

  // =====================================================
  // DEPARTMENT OPTIONS
  // =====================================================

  const departments = useMemo(() => {
    const values = employees
      .map((employee) => employee.department)
      .filter(Boolean)

    return Array.from(new Set(values)).sort()
  }, [employees])

  // =====================================================
  // FETCH EMPLOYEES
  // =====================================================

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        status,
        q: search,
        dept: department === "all" ? "" : department,
        page: String(page),
        limit: String(LIMIT),
      })

      const response = await fetch(`/api/employees?${params.toString()}`, {
        cache: "no-store",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil data karyawan")
      }

      const employeeData: Employee[] = Array.isArray(result)
        ? result
        : result.employees || result.data || []

      setEmployees(employeeData)

      if (!Array.isArray(result)) {
        setTotalEmployees(
          Number(result.total ?? result.totalEmployees ?? employeeData.length),
        )

        setTotalPages(
          Math.max(1, Number(result.totalPages ?? 1)),
        )

        setActiveCount(Number(result.activeCount ?? 0))
        setInactiveCount(Number(result.inactiveCount ?? 0))
      } else {
        setTotalEmployees(employeeData.length)
        setTotalPages(1)

        setActiveCount(
          employeeData.filter((employee) => employee.isActive).length,
        )

        setInactiveCount(
          employeeData.filter((employee) => !employee.isActive).length,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan",
      )
    } finally {
      setLoading(false)
    }
  }, [search, department, status, page])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEmployees()
    }, 300)

    return () => clearTimeout(timeout)
  }, [fetchEmployees])

  useEffect(() => {
    setPage(1)
  }, [search, department, status])

  // =====================================================
  // MODAL HANDLERS
  // =====================================================

  const openAddModal = () => {
    setSelectedEmployee(null)
    setForm({
      ...emptyForm,
      leaveYear: new Date().getFullYear(),
    })
    setModal("add")
  }

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee)

    setForm({
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      leaveYear: employee.leave?.year ?? new Date().getFullYear(),
      leaveTotal: Number(employee.leave?.total ?? 0),
      leaveUsed: Number(employee.leave?.used ?? 0),
    })

    setModal("edit")
  }

  const openDetailModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setModal("detail")
  }

  const closeModal = () => {
    if (saving) return

    setModal(null)
    setSelectedEmployee(null)
  }

  // =====================================================
  // FORM SUBMIT - CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!form.employeeCode.trim() || !form.name.trim()) {
      showToast(
        "error",
        "Validation Failed",
        "Employee Code dan nama wajib diisi.",
      )
      return
    }

    if (modal === "edit") {
      if (
        !Number.isInteger(Number(form.leaveYear)) ||
        Number(form.leaveYear) < 2000
      ) {
        showToast(
          "error",
          "Invalid Leave Year",
          "Tahun cuti tidak valid.",
        )
        return
      }

      if (
        !Number.isInteger(Number(form.leaveTotal)) ||
        Number(form.leaveTotal) < 0 ||
        !Number.isInteger(Number(form.leaveUsed)) ||
        Number(form.leaveUsed) < 0
      ) {
        showToast(
          "error",
          "Invalid Leave Balance",
          "Total dan cuti terpakai harus berupa bilangan bulat positif atau nol.",
        )
        return
      }

      if (Number(form.leaveUsed) > Number(form.leaveTotal)) {
        showToast(
          "error",
          "Invalid Leave Balance",
          "Cuti terpakai tidak boleh melebihi total cuti.",
        )
        return
      }
    }

    try {
      setSaving(true)

      const isEdit = modal === "edit"

      const url = isEdit
        ? `/api/employees/${selectedEmployee?.id}`
        : "/api/employees"

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeCode: form.employeeCode.trim(),
          name: form.name.trim(),
          department: form.department.trim(),
          position: form.position.trim(),
          ...(isEdit
            ? {
                leave: {
                  year: Number(form.leaveYear),
                  total: Number(form.leaveTotal),
                  used: Number(form.leaveUsed),
                },
              }
            : {}),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal menyimpan data karyawan",
        )
      }

      setModal(null)
      setSelectedEmployee(null)
      setForm(emptyForm)

      await fetchEmployees()

      showToast(
        "success",
        isEdit ? "Employee Updated" : "Employee Created",
        isEdit
          ? "Data karyawan berhasil diperbarui."
          : "Karyawan baru berhasil ditambahkan.",
      )
    } catch (err) {
      showToast(
        "error",
        "Save Failed",
        err instanceof Error
          ? err.message
          : "Gagal menyimpan data karyawan.",
      )
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // ACTIVATE / DEACTIVATE
  // =====================================================

  const handleToggleStatus = (employee: Employee) => {
    setConfirmAction({
      type: "status",
      employee,
      nextStatus: !employee.isActive,
    })
  }

  // =====================================================
  // DELETE EMPLOYEE
  // =====================================================

  const handleDeleteEmployee = (employee: Employee) => {
    setConfirmAction({
      type: "delete",
      employee,
    })
  }

  // =====================================================
  // EXECUTE CONFIRMED ACTION
  // =====================================================

  const executeConfirmedAction = async () => {
    if (!confirmAction) return

    const action = confirmAction
    const employee = action.employee
    const isDelete = action.type === "delete"

    const loadingKey = isDelete
      ? `delete:${employee.id}`
      : employee.id

    try {
      setActionLoading(loadingKey)

      const response = await fetch(
        `/api/employees/${employee.id}`,
        {
          method: isDelete ? "DELETE" : "PATCH",
          ...(isDelete
            ? {}
            : {
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  isActive: action.nextStatus,
                }),
              }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            (isDelete
              ? "Gagal menghapus karyawan."
              : "Gagal mengubah status karyawan."),
        )
      }

      setConfirmAction(null)

      if (isDelete && selectedEmployee?.id === employee.id) {
        setSelectedEmployee(null)
        setModal(null)
      }

      if (isDelete && employees.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1))
      } else {
        await fetchEmployees()
      }

      showToast(
        "success",
        isDelete ? "Employee Deleted" : "Status Updated",
        isDelete
          ? `${employee.name} berhasil dihapus.`
          : `${employee.name} berhasil ${
              action.nextStatus ? "diaktifkan" : "dinonaktifkan"
            }.`,
      )
    } catch (err) {
      setConfirmAction(null)

      showToast(
        "error",
        "Action Failed",
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      )
    } finally {
      setActionLoading(null)
    }
  }

  // =====================================================
  // FORM HELPERS
  // =====================================================

  const formatNumber = (value: number | undefined) => {
    return Number(value ?? 0).toLocaleString("id-ID")
  }

  const leaveRemaining = Math.max(
    0,
    Number(form.leaveTotal || 0) - Number(form.leaveUsed || 0),
  )

  const updateForm = (
    field: keyof EmployeeForm,
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // =====================================================
  // PAGE UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Heading */}

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>HRD</span>
              <span>/</span>
              <span className="font-medium text-teal-600 dark:text-teal-400">
                Employee Management
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Employee Management
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage employee information, employment status, and annual leave.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchEmployees}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Summary Cards */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Employees"
            value={formatNumber(totalEmployees)}
            icon={<Users className="h-5 w-5" />}
            color="blue"
          />

          <SummaryCard
            title="Active Employees"
            value={formatNumber(activeCount)}
            icon={<UserCheck className="h-5 w-5" />}
            color="green"
          />

          <SummaryCard
            title="Inactive Employees"
            value={formatNumber(inactiveCount)}
            icon={<UserX className="h-5 w-5" />}
            color="orange"
          />
        </div>

        {/* Employee Table */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Employee List
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  View and manage all registered employees.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

                {/* Search */}

                <div className="relative sm:col-span-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name or code..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {/* Department Filter */}

                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="all">All Departments</option>

                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Department</th>
                  <th className="px-5 py-4 font-semibold">Position</th>
                  <th className="px-5 py-4 font-semibold">Annual Leave</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-teal-600" />

                      <p className="mt-3 text-sm text-slate-500">
                        Loading employees...
                      </p>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Users className="mx-auto h-9 w-9 text-slate-300" />

                      <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">
                        No employees found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Try changing your search or filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                            {employee.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {employee.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {employee.employeeCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {employee.department || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {employee.position || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {formatNumber(employee.leave?.remaining)}

                          <span className="font-normal text-slate-400">
                            {" "}/ {formatNumber(employee.leave?.total)}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all"
                            style={{
                              width: `${
                                employee.leave?.total
                                  ? Math.min(
                                      100,
                                      (Number(employee.leave.used) /
                                        Number(employee.leave.total)) *
                                        100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Used: {formatNumber(employee.leave?.used)} days ·{" "}
                          {employee.leave?.year ?? new Date().getFullYear()}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge active={employee.isActive} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">

                          {/* View */}

                          <ActionButton
                            title="View Details"
                            onClick={() => openDetailModal(employee)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionButton>

                          {/* Edit */}

                          <ActionButton
                            title="Edit Employee"
                            onClick={() => openEditModal(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </ActionButton>

                          {/* Delete */}

                          <ActionButton
                            title="Delete Employee"
                            disabled={
                              actionLoading === employee.id ||
                              actionLoading === `delete:${employee.id}`
                            }
                            onClick={() => handleDeleteEmployee(employee)}
                          >
                            {actionLoading === `delete:${employee.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </ActionButton>

                          {/* Activate / Deactivate */}

                          <ActionButton
                            title={employee.isActive ? "Deactivate" : "Activate"}
                            disabled={actionLoading === employee.id}
                            onClick={() => handleToggleStatus(employee)}
                          >
                            {actionLoading === employee.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power
                                className={`h-4 w-4 ${
                                  employee.isActive
                                    ? "text-red-500"
                                    : "text-green-600"
                                }`}
                              />
                            )}
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {employees.length > 0 ? (page - 1) * LIMIT + 1 : 0}
              {" - "}
              {(page - 1) * LIMIT + employees.length}
              {" of "}
              {totalEmployees} employees
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="min-w-20 text-center text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Add / Edit Modal */}

      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add Employee" : "Edit Employee"}
          subtitle={
            modal === "add"
              ? "Enter the new employee information."
              : "Update employee information."
          }
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <FormField label="Employee Code" required>
                <input
                  required
                  value={form.employeeCode}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      employeeCode: event.target.value,
                    }))
                  }
                  placeholder="Example: HTM001"
                  className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </FormField>

              <FormField label="Employee Name" required>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter employee name"
                  className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </FormField>

              <FormField label="Department" required>
                <input
                  required
                  list="employee-departments"
                  value={form.department}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      department: event.target.value,
                    }))
                  }
                  placeholder="Enter department"
                  className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <datalist id="employee-departments">
                  {departments.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </FormField>

              <FormField label="Position" required>
                <input
                  required
                  value={form.position}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      position: event.target.value,
                    }))
                  }
                  placeholder="Enter position"
                  className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </FormField>
            </div>

            {/* Annual Leave Settings */}

            {modal === "edit" && (
              <section className="min-w-0 rounded-xl border border-teal-200 bg-teal-50/70 p-4 sm:p-5 dark:border-teal-900/60 dark:bg-teal-950/20">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white p-2 text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-400">
                      <CalendarDays className="h-4 w-4" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Annual Leave Settings
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Atur saldo cuti tahunan karyawan.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                    Full day
                  </span>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormField label="Leave Year" required>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      step="1"
                      required
                      value={form.leaveYear}
                      onChange={(event) =>
                        updateForm("leaveYear", Number(event.target.value))
                      }
                      className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </FormField>

                  <FormField label="Total Leave (days)" required>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={form.leaveTotal}
                      onChange={(event) =>
                        updateForm("leaveTotal", Number(event.target.value))
                      }
                      className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </FormField>

                  <FormField label="Used Leave (days)" required>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={form.leaveUsed}
                      onChange={(event) =>
                        updateForm("leaveUsed", Number(event.target.value))
                      }
                      className="block h-11 w-full min-w-0 box-border rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </FormField>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-3 dark:bg-slate-900">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Remaining Leave
                    </p>

                    <p className="text-xs text-slate-400">
                      Total minus used
                    </p>
                  </div>

                  <p className="text-xl font-bold tabular-nums text-teal-700 dark:text-teal-400">
                    {formatNumber(leaveRemaining)}{" "}
                    <span className="text-xs font-medium">days</span>
                  </p>
                </div>

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Perubahan saldo akan dikirim bersama data karyawan. Pastikan API PATCH mendukung properti leave.
                </p>
              </section>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {saving
                  ? "Saving..."
                  : modal === "add"
                    ? "Add Employee"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Employee Detail Modal */}

      {modal === "detail" && selectedEmployee && (
        <Modal
          title="Employee Details"
          subtitle="Employee information and annual leave balance."
          onClose={closeModal}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-xl font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                {selectedEmployee.name?.charAt(0)?.toUpperCase() || "?"}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {selectedEmployee.name}
                </h3>

                <p className="text-sm text-slate-500">
                  {selectedEmployee.employeeCode}
                </p>

                <div className="mt-2">
                  <StatusBadge active={selectedEmployee.isActive} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Department"
                value={selectedEmployee.department}
              />

              <DetailItem
                icon={<Users className="h-4 w-4" />}
                label="Position"
                value={selectedEmployee.position}
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-teal-600" />

                  <h4 className="font-semibold text-slate-800 dark:text-white">
                    Annual Leave Balance
                  </h4>
                </div>

                <span className="text-xs text-slate-500">
                  {selectedEmployee.leave?.year ?? new Date().getFullYear()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <LeaveStat
                  label="Total"
                  value={selectedEmployee.leave?.total}
                />

                <LeaveStat
                  label="Used"
                  value={selectedEmployee.leave?.used}
                />

                <LeaveStat
                  label="Remaining"
                  value={selectedEmployee.leave?.remaining}
                  highlight
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => openEditModal(selectedEmployee)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Pencil className="h-4 w-4" />
                Edit Employee
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}

      {confirmAction && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
              setConfirmAction(null)
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  confirmAction.type === "delete"
                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                }`}
              >
                {confirmAction.type === "delete" ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <Power className="h-5 w-5" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {confirmAction.type === "delete"
                    ? "Delete Employee"
                    : confirmAction.nextStatus
                      ? "Activate Employee"
                      : "Deactivate Employee"}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Please confirm this action.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
              <p className="font-semibold text-slate-900 dark:text-white">
                {confirmAction.employee.name}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {confirmAction.employee.employeeCode} ·{" "}
                {confirmAction.employee.department || "-"}
              </p>
            </div>

            <p className="mb-6 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {confirmAction.type === "delete"
                ? "Data karyawan akan dihapus secara permanen. Karyawan yang memiliki riwayat Form atau transaksi cuti tidak dapat dihapus."
                : `Karyawan ini akan ${
                    confirmAction.nextStatus
                      ? "diaktifkan kembali."
                      : "dinonaktifkan."
                  }`}
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={!!actionLoading}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={!!actionLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : confirmAction.type === "delete" ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}

                {actionLoading
                  ? "Processing..."
                  : confirmAction.type === "delete"
                    ? "Delete Employee"
                    : confirmAction.nextStatus
                      ? "Activate"
                      : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}

      {toast && (
        <div className="fixed right-4 top-4 z-[120] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-2">
          <div
            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-xl dark:bg-slate-900 ${
              toast.type === "success"
                ? "border-emerald-200 dark:border-emerald-900"
                : toast.type === "error"
                  ? "border-red-200 dark:border-red-900"
                  : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <div
              className={`mt-0.5 ${
                toast.type === "success"
                  ? "text-emerald-600"
                  : toast.type === "error"
                    ? "text-red-600"
                    : "text-slate-500"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {toast.title}
              </p>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Close notification"
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* =======================================================
   REUSABLE COMPONENTS
======================================================= */

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: "blue" | "green" | "orange"
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className={`rounded-lg p-2.5 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-500" : "bg-slate-400"
        }`}
      />

      {active ? "Active" : "Inactive"}
    </span>
  )
}

function ActionButton({
  children,
  title,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>

      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {value || "-"}
      </p>
    </div>
  )
}

function LeaveStat({
  label,
  value,
  highlight = false,
}: {
  label: string
  value?: number
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
      <p
        className={`text-xl font-bold ${
          highlight
            ? "text-teal-600 dark:text-teal-400"
            : "text-slate-800 dark:text-white"
        }`}
      >
        {Number(value ?? 0).toLocaleString("id-ID")}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  )
}
