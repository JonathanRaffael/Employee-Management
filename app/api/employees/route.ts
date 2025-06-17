import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all employees
export async function GET() {
  try {
    const employees = await prisma.user.findMany({
      where: {
        // Only get regular employees, not admin/leader/etc.
        role: "employee"
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: true,
        position: true,
        jatahcuti: true,
        cutiterpakai: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}