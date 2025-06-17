import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import LeaderDashboard from "@/components/dashboard/leader-dashboard"
import HRDDashboard from "@/components/dashboard/hrd-dashboard"
import AdminDashboard from "@/components/dashboard/admin-dashboard"
import PMCDashboard from "@/components/dashboard/pmc-dashboard"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const role = session.user.role

  return (
    <main className="min-h-screen bg-gray-50">
      {role === "leader" && <LeaderDashboard user={session.user} />}
      {role === "hrd" && <HRDDashboard user={session.user} />}
      {role === "admin" && <AdminDashboard user={session.user} />}
      {role === "pmc" && <PMCDashboard user={session.user} />}
    </main>
  )
}