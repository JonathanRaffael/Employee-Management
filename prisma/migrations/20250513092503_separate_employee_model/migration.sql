/*
  Warnings:

  - You are about to drop the column `cutiterpakai` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `jatahcuti` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sisaCuti` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_employeeId_fkey";

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "leaveDays" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "cutiterpakai",
DROP COLUMN "department",
DROP COLUMN "employeeId",
DROP COLUMN "jatahcuti",
DROP COLUMN "position",
DROP COLUMN "sisaCuti";

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "jatahcuti" INTEGER NOT NULL DEFAULT 12,
    "cutiterpakai" INTEGER NOT NULL DEFAULT 0,
    "sisaCuti" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
