import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FormStatusBadgeProps {
  status: string
  className?: string
  customText?: string
}

export default function FormStatusBadge({ status, className, customText }: FormStatusBadgeProps) {
  let badgeText = customText || status
  let badgeClass = ""

  switch (status) {
    case "approved":
      badgeClass =
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/30"
      badgeText = customText || "Approved"
      break
    case "rejected":
      badgeClass =
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/30"
      badgeText = customText || "Rejected"
      break
    case "process":
      badgeClass =
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30"
      badgeText = customText || "In Process"
      break
    case "pending_hrd":
      badgeClass =
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30"
      badgeText = customText || "Waiting for HRD approval"
      break
    case "pending_pmc":
      badgeClass =
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/30"
      badgeText = customText || "Waiting for PMC approval"
      break
    case "pending":
    default:
      badgeClass =
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/30"
      badgeText = customText || "Pending"
      break
  }

  return <Badge className={cn(badgeClass, className)}>{badgeText}</Badge>
}
