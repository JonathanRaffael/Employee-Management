
import type React from "react"
import { Inter } from "next/font/google"
import Providers from "./providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "PT HANG TONG MANUFACTORY - Employee Management System",
  description: "Employee Management System for PT HANG TONG MANUFACTORY",
  generator: "Jo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
