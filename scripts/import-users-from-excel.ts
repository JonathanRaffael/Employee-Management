import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"

const prisma = new PrismaClient()

async function main() {
  const workbook = XLSX.readFile("IMPORT_EMPLOYEE_CLEAN.xlsx")
  const sheet = workbook.Sheets["IMPORT_EMPLOYEE"]

  if (!sheet) {
    throw new Error("Sheet IMPORT_EMPLOYEE tidak ditemukan")
  }

  const rows: any[] = XLSX.utils.sheet_to_json(sheet)
  console.log(`📄 Total row dibaca: ${rows.length}`)

  for (const row of rows) {
    const employeeCode = row.employeeCode
      ? String(row.employeeCode).trim()
      : null

    const name = row.name?.toString().trim()
    const department = row.department?.toString().trim() ?? null
    const position = row.position?.toString().trim() ?? null

    let email = row.email ? row.email.toString().trim() : null

    // 🔑 EMAIL WAJIB (fallback)
    if (!email && employeeCode) {
      email = `emp_${employeeCode}@internal.local`
    }

    const jatahCuti = Number(row.jatahCuti) || 0
    const cutiTerpakai = Number(row.cutiTerpakai) || 0

    if (!employeeCode || !name || !email) {
      console.log("⏭ Skip row tanpa employeeCode / name / email")
      continue
    }

    /* =========================
       1️⃣ CEK EMPLOYEE
    ========================= */
    const existingEmployee = await prisma.employee.findFirst({
  where: { employeeCode },
})

    if (existingEmployee) {
      console.log(`⏭ Employee sudah ada: ${employeeCode}`)
      continue
    }

    /* =========================
       2️⃣ BUAT USER
    ========================= */
    const user = await prisma.user.create({
      data: {
        email,
        role: "employee",
      },
    })

    /* =========================
       3️⃣ BUAT EMPLOYEE & LINK KE USER
    ========================= */
    await prisma.employee.create({
      data: {
        employeeCode,
        name,
        department,
        position,
        userId: user.id,
      },
    })

    /* =========================
       4️⃣ (OPSIONAL) SIMPAN CUTI
       (aktifkan kalau tabel ada)
    ========================= */
    /*
    await prisma.leaveBalance.create({
      data: {
        employeeCode,
        year: new Date().getFullYear(),
        total: jatahCuti,
        used: cutiTerpakai,
      },
    })
    */

    console.log(`✅ Employee + User dibuat: ${employeeCode}`)
  }

  console.log("🎉 IMPORT SELESAI")
}

main()
  .catch((e) => {
    console.error("❌ Import error:", e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
