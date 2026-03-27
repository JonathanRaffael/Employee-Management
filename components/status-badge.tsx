import { Badge } from "@/components/ui/badge"

interface FormStatusBadgeProps {
  status: string
  className?: string
}

export default function FormStatusBadge({ status, className = "" }: FormStatusBadgeProps) {
  const statusNormalized = status?.toUpperCase() ?? ""

  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    WAITING_SUPERVISOR: {
      label: "Waiting Supervisor",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    WAITING_HRD: {
      label: "Waiting HRD",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    WAITING_LEADER: {
      label: "Waiting Leader",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    PROCESS: {
      label: "In Process",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
    APPROVED: {
      label: "Approved",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    },
    APPROVED_LEADER: {
      label: "Leader Approved",
      className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    },
    APPROVED_SUPERVISOR: {
      label: "Supervisor Approved",
      className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    },
    PENDING_HRD: {
      label: "Pending HRD",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
  }

  const config = statusConfig[statusNormalized] || {
    label: status,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  }

  return <Badge className={`${config.className} ${className}`}>{config.label}</Badge>
}
