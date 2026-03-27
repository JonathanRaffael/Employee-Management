import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import LoginForm from "@/components/login-form"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <main
      suppressHydrationWarning
      className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50"
    >
      <LoginForm />
    </main>
  )
}
