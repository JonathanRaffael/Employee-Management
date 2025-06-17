import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function updateFormNumbers() {
  try {
    console.log("Starting form number update...")

    // Get all forms ordered by creation date
    const forms = await prisma.form.findMany({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        formNumber: null,
      },
    })

    console.log(`Found ${forms.length} forms without form numbers`)

    // Update each form with a sequential number
    for (let i = 0; i < forms.length; i++) {
      const formNumber = i + 1
      await prisma.form.update({
        where: { id: forms[i].id },
        data: { formNumber },
      })
      console.log(`Updated form ${forms[i].id} with number ${formNumber}`)
    }

    console.log("Form number update completed successfully")
  } catch (error) {
    console.error("Error updating form numbers:", error)
  } finally {
    await prisma.$disconnect()
  }
}

updateFormNumbers()
