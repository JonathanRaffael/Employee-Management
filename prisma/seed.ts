const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

// Using a different name to avoid conflicts
const prismaClient = new PrismaClient();

async function main() {
  console.log("Seeding data...");

  // Create admin, leader, hrd, and pmc users
  await prismaClient.user.upsert({
    where: { email: "admin@hangtong.com" },
    update: {},
    create: {
      email: "admin@hangtong.com",
      name: "Admin User",
      password: await bcryptjs.hash("admin123", 10),
      role: "admin",
      sisaCuti: 12, // Add sisaCuti field
    },
  });

  await prismaClient.user.upsert({
    where: { email: "leader@hangtong.com" },
    update: {},
    create: {
      email: "leader@hangtong.com",
      name: "Leader User",
      password: await bcryptjs.hash("leader123", 10),
      role: "leader",
      employeeId: "EMP001",
      department: "Production",
      position: "Team Leader",
      sisaCuti: 12, // Add sisaCuti field
    },
  });

  await prismaClient.user.upsert({
    where: { email: "hrd@hangtong.com" },
    update: {},
    create: {
      email: "hrd@hangtong.com",
      name: "HRD User",
      password: await bcryptjs.hash("hrd123", 10),
      role: "hrd",
      employeeId: "EMP002",
      department: "Human Resources",
      position: "HR Manager",
      sisaCuti: 12, // Add sisaCuti field
    },
  });

  await prismaClient.user.upsert({
    where: { email: "pmc@hangtong.com" },
    update: {},
    create: {
      email: "pmc@hangtong.com",
      name: "PMC User",
      password: await bcryptjs.hash("pmc123", 10),
      role: "pmc",
      employeeId: "EMP003",
      department: "Production",
      position: "Production Management Control",
      sisaCuti: 12, // Add sisaCuti field
    },
  });

  // Create 34 employees with different departments, positions, and leave balances
  const departments = ["Production", "Quality Control", "Maintenance", "Logistics", "Assembly"];
  const positions = ["Operator", "Technician", "Inspector", "Assembler", "Helper"];
  
  // Employee data array
  const employees = [
    { name: "Togar Marbun", department: "Maintenance", position: "Leader", jatahcuti: 12, cutiterpakai: 6 },
    { name: "Colautinus Titus B", department: "Maintenance", position: "Maintenance", jatahcuti: 12, cutiterpakai: 2 },
    { name: "Siswanto", department: "Mixing", position: "Leader", jatahcuti: 12, cutiterpakai: 12 },
    { name: "Meliana Octavia", department: "HRD", position: "HRD", jatahcuti: 12, cutiterpakai: 10 },
    { name: "Febry H", department: "Admin/IQC", position: "Admin/IQC", jatahcuti: 12, cutiterpakai: 10 },
    { name: "Murni Tio Fanta H", department: "Quality Control", position: "Leader", jatahcuti: 12, cutiterpakai: 3 },
    { name: "Yenci Winata S", department: "Lab. Engineer", position: "Leader", jatahcuti: 12, cutiterpakai: 7 },
    { name: "Rudi Manalu", department: "Maintenance", position: "Maintenance", jatahcuti: 12, cutiterpakai: 0 },
    { name: "Sasi Rahmawati", department: "De-flashing", position: "Leader", jatahcuti: 12, cutiterpakai: 5 },
    { name: "Siti Aminah", department: "De-Flashing", position: "De-Flashing", jatahcuti: 12, cutiterpakai: 10 }, 
    { name: "Muhammad Irpandy", department: "Quality Control", position: "Quality Control", jatahcuti: 12, cutiterpakai: 6 },
    { name: "Andi Agustian", department: "Molding", position: "Molding", jatahcuti: 12, cutiterpakai: 1 },
    { name: "Jeki Yuri", department: "Molding", position: "Molding", jatahcuti: 12, cutiterpakai: 0 },
    { name: "Winda Yohana H", department: "Quality Control", position: "Quality Control", jatahcuti: 12, cutiterpakai: 3 },
    { name: "Mesi Hayani", department: "Mesi Hayani", position: "Leader", jatahcuti: 12, cutiterpakai: 4 },
    { name: "Sonia M Simatupang", department: "De-Flashing", position: "De-Flashing", jatahcuti: 12, cutiterpakai: 1 },
    { name: "Engla Derma", department: "Quality Control", position: "Quality Control", jatahcuti: 12, cutiterpakai: 5 },
    { name: "Javefro Lay", department: "Warehouse", position: "Warehouse", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Michelle Agustin", department: "Lab", position: "Lab", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Rendy Rezika", department: "Mixing", position: "Mixing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Purbo Apriyanto", department: "Mixing", position: "Mixing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Raffael Jonathan N H", department: "IT", position: "IT", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Valencia Apriska Vivi", department: "Quality Control", position: "Quality Control", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Muhammad Fuad Rizky", department: "Quality Control", position: "Quality Control", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Fitri Ayu Lestari", department: "De-Flashing", position: "De-Flashing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Toto Sugiarto", department: "Quality Control", position: "Quality Control", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Agus Setiawan", department: "Agus Setiawan", position: "Agus Setiawan", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Bunga Arum Arimbi", department: "De-Flashing", position: "De-Flashing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Friska Dewi Astuti H", department: "Quality Control", position: "Quality Control", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Nur Ragil Saldi Nabila", department: "De-Flashing", position: "De-Flashing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Zainal Abidin", department: "Molding", position: "Molding", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Dara Gita Sibarani", department: "De-Flashing", position: "De-Flashing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Gabryella Novita S", department: "De-Flashing", position: "De-Flashing", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Khomsatun", department: "Cleaner", position: "Cleaner", jatahcuti: 12, cutiterpakai: 1 },
    { name: "Yeremias L", department: "Security Chief", position: "Security Chief", jatahcuti: 0, cutiterpakai:0 },
    { name: "Gregorius T", department: "Security", position: "Security", jatahcuti: 0, cutiterpakai: 0 },
    { name: "Amos Istenli", department: "Security", position: "Security", jatahcuti: 0, cutiterpakai: 0 },
  ];

  // Create each employee in the database
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const employeeId = `EMP${(i + 4).toString().padStart(3, '0')}`; // Start from EMP004
    
    // Calculate sisaCuti based on jatahcuti and cutiterpakai
    const sisaCuti = emp.jatahcuti - emp.cutiterpakai;
    
    await prismaClient.user.upsert({
      where: { email: `${emp.name.toLowerCase().replace(/\s+/g, '.')}@hangtong.com` },
      update: {},
      create: {
        email: `${emp.name.toLowerCase().replace(/\s+/g, '.')}@hangtong.com`,
        name: emp.name,
        password: await bcryptjs.hash("employee123", 10), // Default password
        role: "employee", // All are regular employees
        employeeId: employeeId,
        department: emp.department,
        position: emp.position,
        jatahcuti: emp.jatahcuti,
        cutiterpakai: emp.cutiterpakai,
        sisaCuti: sisaCuti // Add calculated sisaCuti field
      },
    });
  }
}

main()
  .then(async () => {
    console.log("Seeding completed successfully.");
    await prismaClient.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prismaClient.$disconnect();
    process.exit(1);
  });