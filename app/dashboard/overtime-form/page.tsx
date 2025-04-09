import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OvertimeFormComponent from "@/components/forms/overtime-form"

export default async function OvertimeFormPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  if (session.user.role !== "leader") {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <OvertimeFormComponent user={session.user} />
    </main>
  )
}
