import { PrismaClient } from "../node_modules/@prisma/client";
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@hangtong.com' },
    update: {},
    create: {
      email: 'admin@hangtong.com',
      name: 'Admin User',
      password: await hash('admin123', 10),
      role: 'admin',
    },
  })

  // Create leader user
  await prisma.user.upsert({
    where: { email: 'leader@hangtong.com' },
    update: {},
    create: {
      email: 'leader@hangtong.com',
      name: 'Leader User',
      password: await hash('leader123', 10),
      role: 'leader',
      employeeId: 'EMP001',
      department: 'Production',
      position: 'Team Leader',
    },
  })

  // Create HRD user
  await prisma.user.upsert({
    where: { email: 'hrd@hangtong.com' },
    update: {},
    create: {
      email: 'hrd@hangtong.com',
      name: 'HRD User',
      password: await hash('hrd123', 10),
      role: 'hrd',
      employeeId: 'EMP002',
      department: 'Human Resources',
      position: 'HR Manager',
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })