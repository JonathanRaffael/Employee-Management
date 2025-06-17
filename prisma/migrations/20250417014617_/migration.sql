/*
  Warnings:

  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Intern` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_formId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_internId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_submittedById_fkey";

-- DropForeignKey
ALTER TABLE "Intern" DROP CONSTRAINT "Intern_leaderId_fkey";

-- DropTable
DROP TABLE "Attendance";

-- DropTable
DROP TABLE "Intern";
