import useSWR from 'swr'
import { useCallback, useMemo } from 'react'

interface FormFilters {
  activeTab: string
  timeFilter: string
  selectedMonth: { month: number; year: number } | null
  departmentFilter: string
  requestTypeFilter: string
  sortOption: string
  page: number
  limit: number
}

interface Form {
  id: string
  type: string
  status: string
  createdAt: string
  data: any
  employee: {
    name: string
    employeeId: string
    department: string
    position: string
  }
}

interface PaginationData {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface FormsResponse {
  data: Form[]
  pagination: PaginationData
}

// ✅ SWR fetcher
const fetcher = async (url: string): Promise<FormsResponse> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}

function generateSWRKey(filters: FormFilters): string {
  const params = new URLSearchParams()

  params.append('page', filters.page.toString())
  params.append('limit', filters.limit.toString())

  if (filters.activeTab !== 'all') {
    params.append('status', filters.activeTab)
  }

  if (filters.selectedMonth) {
    const startDate = new Date(filters.selectedMonth.year, filters.selectedMonth.month, 1)
    const endDate = new Date(filters.selectedMonth.year, filters.selectedMonth.month + 1, 0)
    params.append('startDate', startDate.toISOString())
    params.append('endDate', endDate.toISOString())
  } else if (filters.timeFilter !== 'all') {
    params.append('timeFilter', filters.timeFilter)
  }

  if (filters.requestTypeFilter !== 'all') {
    params.append('type', filters.requestTypeFilter)
  }

  if (filters.departmentFilter !== 'all') {
    params.append('department', filters.departmentFilter)
  }

  return `/api/forms?${params.toString()}`
}

// ✅ Main hook to fetch forms
export function useForms(filters: FormFilters) {
  const swrKey = useMemo(() => generateSWRKey(filters), [filters])

  const {
    data,
    error,
    isLoading,
    mutate,
    isValidating,
  } = useSWR<FormsResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
  })

  const refreshForms = useCallback(() => mutate(), [mutate])

  const deleteForm = useCallback(async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete form')

      if (data) {
        const updatedData = {
          ...data,
          data: data.data.filter(form => form.id !== formId),
          pagination: {
            ...data.pagination,
            total: data.pagination.total - 1,
          },
        }
        mutate(updatedData, false)
      }

      await mutate()
      return true
    } catch (error) {
      console.error('Error deleting form:', error)
      throw error
    }
  }, [data, mutate])

  return {
    forms: data?.data || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    isLoading,
    isValidating,
    error,
    refreshForms,
    deleteForm,
  }
}

// ✅ Hook untuk statistik HRD
export function useFormsStats(filters: Omit<FormFilters, 'page' | 'limit'>) {
  const statsKey = useMemo(() => {
    const params = new URLSearchParams()
    params.append('getAllForms', 'true')

    if (filters.activeTab !== 'all') {
      params.append('status', filters.activeTab)
    }

    if (filters.selectedMonth) {
      const startDate = new Date(filters.selectedMonth.year, filters.selectedMonth.month, 1)
      const endDate = new Date(filters.selectedMonth.year, filters.selectedMonth.month + 1, 0)
      params.append('startDate', startDate.toISOString())
      params.append('endDate', endDate.toISOString())
    } else if (filters.timeFilter !== 'all') {
      params.append('timeFilter', filters.timeFilter)
    }

    if (filters.requestTypeFilter !== 'all') {
      params.append('type', filters.requestTypeFilter)
    }

    if (filters.departmentFilter !== 'all') {
      params.append('department', filters.departmentFilter)
    }

    return `/api/forms/stats?${params.toString()}`
  }, [filters])

  const {
    data: statsResponse,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR<FormsResponse>(statsKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const formsArray = statsResponse?.data ?? []

  const stats = useMemo(() => {
    const totalLeave = formsArray.filter(f => f.type === 'leave').length
    const totalOvertime = formsArray.filter(f => f.type === 'overtime').length
    const pendingLeave = formsArray.filter(f => f.type === 'leave' && f.status === 'pending').length
    const pendingOvertime = formsArray.filter(f => f.type === 'overtime' && f.status === 'pending').length
    const approvedLeave = formsArray.filter(f => f.type === 'leave' && f.status === 'approved').length
    const approvedOvertime = formsArray.filter(f => f.type === 'overtime' && f.status === 'approved').length
    const rejectedLeave = formsArray.filter(f => f.type === 'leave' && f.status === 'rejected').length
    const rejectedOvertime = formsArray.filter(f => f.type === 'overtime' && f.status === 'rejected').length

    return {
      totalLeave,
      totalOvertime,
      pendingLeave,
      pendingOvertime,
      approvedLeave,
      approvedOvertime,
      rejectedLeave,
      rejectedOvertime,
      pendingLeavePercent: totalLeave ? Math.round((pendingLeave / totalLeave) * 100) : 0,
      pendingOvertimePercent: totalOvertime ? Math.round((pendingOvertime / totalOvertime) * 100) : 0,
      totalRequests: formsArray.length,
    }
  }, [formsArray])

  return {
    stats,
    isLoading: statsLoading,
    error: statsError,
  }
}
