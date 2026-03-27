import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import LeaveFormComponent from "@/components/forms/leave-form"

export default async function LeaveFormPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  if (session.user.role !== "LEADER") {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <LeaveFormComponent user={session.user} />
    </main>
  )
}
