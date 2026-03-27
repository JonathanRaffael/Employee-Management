import { PrismaClient } from "@prisma/client"
import bcryptjs from "bcryptjs"

const prisma = new PrismaClient()

/**
 * =========================
 * SEED USERS (LOGIN)
 * =========================
 */
async function seedUsers() {
  console.log("🌱 Seeding users (login accounts)...")

  const users = [
    {
      email: "admin@hangtong.com",
      name: "Admin User",
      password: "ADMINHTMF",
      role: "ADMIN",
      department: "IT",
      position: "System Admin",
    },
    {
      email: "leader@hangtong.com",
      name: "Leader User",
      password: "LEADERHTMF",
      role: "LEADER",
      department: "Production",
      position: "Team Leader",
    },
    {
      email: "hrd@hangtong.com",
      name: "HRD User",
      password: "HRDHTMF",
      role: "HRD",
      department: "Human Resources",
      position: "HR Manager",
    },
    {
      email: "pmc@hangtong.com",
      name: "PMC User",
      password: "PMCHTMF",
      role: "PMC",
      department: "Production",
      position: "PMC Staff",
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        password: await bcryptjs.hash(user.password, 10),
        role: user.role,
        department: user.department,
        position: user.position,
      },
    })
  }

  console.log("✅ Users seeded")
}

/**
 * =========================
 * SEED EMPLOYEES + LEAVE
 * =========================
 */
async function seedEmployees() {
  console.log("🌱 Seeding employees & leave balances...")

  const year = new Date().getFullYear()

  const employees = [
    { code: "0001", name: "Sunaryo", dept: "Operations", position: "Operations Manager", total: 0, used: 0 },
    { code: "0010", name: "Meliana Octavia Rambe", dept: "HRGA", position: "HRGA Supervisor", total: 24, used: 14 },
    { code: "0013", name: "Yenci Winata Sitanggang", dept: "PPIC", position: "Planner", total: 24, used: 14 },
    { code: "0023", name: "Sasi Rahmawati", dept: "HRGA", position: "HRGA Admin Asst.", total: 24, used: 10 },
    { code: "0045", name: "Raffael Jonathan Namora H.", dept: "HRGA", position: "IT Staff", total: 12, used: 6 },
    { code: "0011", name: "Febry Heriati Panjaitan", dept: "HRGA", position: "General Office Admin.", total: 24, used: 16 },
    { code: "0006", name: "Togar Marbun", dept: "Maintenance", position: "Maintenance Leader", total: 24, used: 8 },
    { code: "0029", name: "Andi Agustian", dept: "Molding", position: "Molding Leader", total: 12, used: 12 },
    { code: "0033", name: "Mesi Hayani", dept: "Tubing", position: "Tubing Leader", total: 12, used: 7 },
    { code: "0009", name: "Siswanto", dept: "Mixing", position: "Mixing Leader", total: 24, used: 15 },
    { code: "0024", name: "Siti Aminah", dept: "Deflashing", position: "Deflashing Leader", total: 24, used: 10 },
    { code: "0053", name: "Agus Setiawan", dept: "QAQC", position: "Leader", total: 12, used: 0 },
    { code: "0052", name: "Toto Sugiarto", dept: "QAQC", position: "QC Asst. Leader", total: 12, used: 0 },
    { code: "0070", name: "R. Fadly Adriansyah", dept: "Warehouse", position: "Operator", total: 0, used: 0 },
    { code: "0076", name: "Sherly Wafi", dept: "HRGA", position: "Data Entry", total: 0, used: 0 },
    { code: "0031", name: "Winda Yohana H", dept: "QAQC", position: "Operator", total: 12, used: 8 },
    { code: "0035", name: "Engla Derma", dept: "QAQC", position: "Leader", total: 12, used: 5 },
    { code: "0048", name: "Valencia Apriska Vivi", dept: "QAQC", position: "Operator", total: 12, used: 5 },
    { code: "0049", name: "Muhammad Fuad Rizky", dept: "QAQC", position: "Operator", total: 12, used: 0 },
    { code: "0062", name: "Heri Aminuddin", dept: "QAQC", position: "Operator", total: 0, used: 0 },
    { code: "0066", name: "Elvi Maria Nababan", dept: "QAQC", position: "Operator", total: 0, used: 0 },
    { code: "0068", name: "Indriarti Grestina", dept: "QAQC", position: "Operator", total: 0, used: 0 },
    { code: "0043", name: "Rendy Rezika", dept: "Mixing", position: "Operator", total: 12, used: 0 },
    { code: "0044", name: "Purbo Apriyanto", dept: "Mixing", position: "Operator", total: 12, used: 3 },
    { code: "0030", name: "Jeki Yuri", dept: "Molding", position: "Operator", total: 12, used: 12 },
    { code: "0058", name: "Zainal Abidin", dept: "Molding", position: "Operator", total: 12, used: 0 },
    { code: "0074", name: "Eka Hartini Tarihoran", dept: "Tubing", position: "Operator", total: 0, used: 0 },
    { code: "0057", name: "Nur Ragil Saldi Nabila", dept: "Tubing", position: "Operator", total: 0, used: 0 },
    { code: "0059", name: "Dara Gita Sibarani", dept: "Deflashing", position: "Operator", total: 0, used: 0 },
    { code: "0060", name: "Gabryella Novita S", dept: "Deflashing", position: "Operator", total: 0, used: 0 },
    { code: "0034", name: "Sonia M Simatupang", dept: "Deflashing", position: "Operator", total: 12, used: 12 },
    { code: "0008", name: "Colautinus Titus B", dept: "Maintenance", position: "Maintenance Technician", total: 24, used: 4 },
    { code: "0018", name: "Rudi Manalu", dept: "Tubing", position: "Tubing Technician", total: 24, used: 6 },
    { code: "0019", name: "Gregorius T", dept: "HRGA", position: "Chief of Security", total: 24, used: 0 },
    { code: "0020", name: "Yeremias L", dept: "HRGA", position: "Personel of Security", total: 24, used: 0 },
    { code: "0028", name: "Amos Istenli", dept: "Molding", position: "Operator", total: 12, used: 0 },
    { code: "0026", name: "Khomsatun", dept: "HRGA", position: "Cleaning Services", total: 12, used: 2 },
    { code: "0077", name: "Sita Masitah", dept: "HRGA", position: "Operator", total: 0, used: 0 },
    { code: "0026A", name: "Rinanda Putri Cahyani", dept: "HRGA", position: "Operator", total: 0, used: 0 },
    { code: "0028A", name: "Firman Adriansyah", dept: "HRGA", position: "Operator", total: 0, used: 0 },
    { code: "0028B", name: "Dewi Sumiarti", dept: "HRGA", position: "Operator", total: 0, used: 0 },
    { code: "0026B", name: "Nalal Fauza", dept: "HRGA", position: "Operator", total: 0, used: 0 },
    { code: "0028C", name: "Roy Pranata Manullang", dept: "HRGA", position: "Personel of Security", total: 0, used: 0 },
  ]

  for (const emp of employees) {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: emp.code,
        name: emp.name,
        department: emp.dept,
        position: emp.position,
      },
    })

    await prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year,
        total: emp.total,
        used: emp.used,
      },
    })
  }

  console.log("✅ Employees & leave balances seeded")
}

/**
 * =========================
 * MAIN
 * =========================
 */
async function main() {
  try {
    console.log("🚀 Starting seeding...")
    await seedUsers()
    await seedEmployees()
    console.log("🎉 Seeding completed successfully")
  } catch (error) {
    console.error("❌ Seeding failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
