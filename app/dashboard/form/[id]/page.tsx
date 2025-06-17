import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import FormDetails from "@/components/forms/form-details"

export default async function FormDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  // Await params to ensure they are fully resolved
  const { id } = await params

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const formId = id // Use the awaited id

  // Fetch form data
  const form = await prisma.form.findUnique({ 
    where: { id: formId },
    include: {
      employee: true,
      approvals: {
        include: {
          approver: true,
        },
      },
    },
  })

  if (!form) {
    redirect("/dashboard")
  }

  // Check if user has access to this form
  const userRole = session.user.role
  const userId = session.user.id

  const hasAccess = userRole === "admin" || (userRole === "leader" && form.employeeId === userId) || userRole === "hrd" || userRole === "pmc"

  if (!hasAccess) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <FormDetails form={form} userRole={userRole} userId={userId} />
    </main>
  )
}

