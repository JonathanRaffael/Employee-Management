import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import TrainingRequestForm from "@/components/forms/training-request-form"

export default async function TrainingRequestFormPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  if (session.user.role !== "LEADER") {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <TrainingRequestForm user={session.user} />
    </main>
  )
}
