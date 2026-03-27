// app/dashboard/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import dynamic from "next/dynamic"
import DashboardSkeleton from "./dashboard-skeleton"

// Dynamic dashboards
const LeaderDashboard = dynamic(
  () => import("@/components/dashboard/leader-dashboard"),
  { ssr: true, loading: () => <DashboardSkeleton /> }
)

const HRDDashboard = dynamic(
  () => import("@/components/dashboard/hrd-dashboard"),
  { ssr: true, loading: () => <DashboardSkeleton /> }
)

const AdminDashboard = dynamic(
  () => import("@/components/dashboard/admin-dashboard"),
  { ssr: true, loading: () => <DashboardSkeleton /> }
)

const SupervisorDashboard = dynamic(
  () => import("@/components/dashboard/supervisor-dashboard"),
  { ssr: true, loading: () => <DashboardSkeleton /> }
)

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // 🔥 NORMALISASI ROLE
  const role = session.user.role?.toUpperCase()

  // 🔒 GUARD ROLE
  if (!["LEADER", "HRD", "ADMIN", "SUPERVISOR", "PMC"].includes(role)) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">
          Role tidak dikenali. Hubungi administrator.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {role === "LEADER" && <LeaderDashboard user={session.user} />}
      {role === "HRD" && <HRDDashboard user={session.user} />}
      {role === "ADMIN" && <AdminDashboard user={session.user} />}
      {role === "PMC" && <SupervisorDashboard user={session.user} />}
      {/* PMC bisa diarahkan ke dashboard sendiri nanti */}
    </main>
  )
}
