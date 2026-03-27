/*
  Warnings:

  - You are about to drop the column `employeeSignature` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `hrdApprovalDate` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `hrdSignature` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `leaderApprovalDate` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `leaderId` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `leaderSignature` on the `Form` table. All the data in the column will be lost.
  - You are about to drop the column `employeeSignature` on the `TrainingRequestForm` table. All the data in the column will be lost.
  - You are about to drop the column `managerName` on the `TrainingRequestForm` table. All the data in the column will be lost.
  - You are about to drop the column `supervisorName` on the `TrainingRequestForm` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Form` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_leaderId_fkey";

-- DropIndex
DROP INDEX "Form_leaderId_idx";

-- DropIndex
DROP INDEX "LeaveBalance_year_idx";

-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "employeeSignature",
DROP COLUMN "hrdApprovalDate",
DROP COLUMN "hrdSignature",
DROP COLUMN "leaderApprovalDate",
DROP COLUMN "leaderId",
DROP COLUMN "leaderSignature",
ADD COLUMN     "createdById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrainingRequestForm" DROP COLUMN "employeeSignature",
DROP COLUMN "managerName",
DROP COLUMN "supervisorName";

-- CreateIndex
CREATE INDEX "Form_createdById_idx" ON "Form"("createdById");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
