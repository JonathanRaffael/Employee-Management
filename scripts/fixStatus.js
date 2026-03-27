import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function fixStatus() {
  await prisma.$executeRawUnsafe(`
    UPDATE "Form"
    SET status = 'APPROVED'
    WHERE id IN (
      SELECT "formId"
      FROM "Approval"
      WHERE role = 'HRD'
      AND status = 'APPROVED'
    );
  `)

  console.log("✅ Form status synchronized")
  await prisma.$disconnect()
}

fixStatus()