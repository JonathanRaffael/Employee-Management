// update-leave-balances.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateLeaveBalances() {
  try {
    // Get all users
    const users = await prisma.user.findMany()
    
    // Update each user's sisaCuti
    for (const user of users) {
      const newSisaCuti = user.jatahcuti - user.cutiterpakai
      
      // Use a raw query to update the sisaCuti field
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "sisaCuti" = ${newSisaCuti} 
        WHERE id = ${user.id}
      `
      
      console.log(`Updated user ${user.name}: sisaCuti = ${newSisaCuti}`)
    }
    
    console.log('All leave balances updated successfully')
  } catch (error) {
    console.error('Error updating leave balances:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateLeaveBalances()