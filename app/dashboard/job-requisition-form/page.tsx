import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import JobRequisitionForm from "@/components/forms/job-requisition-form"

export default async function JobRequisitionFormPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  if (session.user.role !== "LEADER") {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <JobRequisitionForm user={session.user} />
    </main>
  )
}
