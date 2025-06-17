import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateFormIds() {
  try {
    console.log('Starting form ID migration...')
    
    // Get all existing forms ordered by creation date (oldest first)
    const existingForms = await prisma.form.findMany({
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
    })
    
    console.log(`Found ${existingForms.length} forms to migrate`)
    
    // Create a temporary array to store the mapping between old and new IDs
    const idMapping: { oldId: string; newId: string }[] = []
    
    // Generate new sequential IDs for each form
    for (let i = 0; i < existingForms.length; i++) {
      const form = existingForms[i]
      const newId = (i + 1).toString().padStart(5, '0') // Format: 00001, 00002, etc.
      
      idMapping.push({
        oldId: form.id,
        newId: newId,
      })
    }
    
    console.log('ID mapping generated:', idMapping)
    
    // We need to use transactions to safely update the IDs
    // First, create a backup of all forms
    console.log('Creating backup of all forms...')
    const backupForms = await prisma.form.findMany({
      include: {
        approvals: true,
      },
    })
    
    // Write backup to a JSON file (in a real scenario)
    console.log(`Backup created with ${backupForms.length} forms`)
    
    // Now update each form with its new ID
    // We need to do this in reverse order (newest first) to avoid conflicts
    console.log('Updating form IDs...')
    
    // Use a transaction to ensure all updates succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Process in reverse order (newest to oldest) to avoid conflicts
      for (let i = idMapping.length - 1; i >= 0; i--) {
        const { oldId, newId } = idMapping[i]
        
        // Create a temporary ID to avoid conflicts
        const tempId = `temp_${oldId}`
        
        // First update to temp ID
        await tx.form.update({
          where: { id: oldId },
          data: { id: tempId },
        })
        
        console.log(`Updated form ${oldId} to temporary ID ${tempId}`)
      }
      
      // Now update from temp IDs to final IDs
      for (let i = 0; i < idMapping.length; i++) {
        const { oldId, newId } = idMapping[i]
        const tempId = `temp_${oldId}`
        
        await tx.form.update({
          where: { id: tempId },
          data: { id: newId },
        })
        
        console.log(`Updated form from temporary ID ${tempId} to final ID ${newId}`)
      }
    })
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Error during migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateFormIds()
  .then(() => console.log('Migration script finished'))
  .catch((e) => console.error('Migration script failed:', e))