import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  color: "teal" | "cyan" | "amber" | "red" | "slate"
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses = {
    teal: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
    cyan: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    slate: "bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400",
  }

  return (
    <Card className="bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className={`${colorClasses[color]} p-4 rounded-xl flex items-center gap-4 shadow-sm`}>
          <Icon className="w-6 h-6" />
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p
              className={`text-xl font-bold ${
                color === "teal"
                  ? "text-teal-700 dark:text-teal-300"
                  : color === "cyan"
                    ? "text-cyan-700 dark:text-cyan-300"
                    : color === "amber"
                      ? "text-amber-700 dark:text-amber-300"
                      : color === "red"
                        ? "text-red-700 dark:text-red-300"
                        : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {value}
            </p>
            {trend && (
              <p className={`text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
                {trend.isPositive ? "↗" : "↘"} {trend.value}%
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
