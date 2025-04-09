import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle } from "lucide-react"

interface FormStatusBadgeProps {
  status: string
}

export default function FormStatusBadge({ status }: FormStatusBadgeProps) {
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center">
        <CheckCircle className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    )
  }

  if (status === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    )
  }

  return (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center">
      <Clock className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  )
}
