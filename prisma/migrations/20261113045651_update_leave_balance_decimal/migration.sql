/*
  Warnings:

  - You are about to alter the column `total` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(8,2)`.
  - You are about to alter the column `used` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(8,2)`.

*/
-- CreateEnum
CREATE TYPE "LeaveTransactionType" AS ENUM ('ALLOCATION', 'ADJUSTMENT', 'DEDUCTION', 'REVERSAL');

-- AlterTable
ALTER TABLE "LeaveBalance" ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "used" SET DEFAULT 0,
ALTER COLUMN "used" SET DATA TYPE DECIMAL(8,2);

-- CreateTable
CREATE TABLE "LeaveTransaction" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "formId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveTransaction_formId_key" ON "LeaveTransaction"("formId");

-- CreateIndex
CREATE INDEX "LeaveTransaction_employeeId_createdAt_idx" ON "LeaveTransaction"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveTransaction_balanceId_createdAt_idx" ON "LeaveTransaction"("balanceId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveTransaction_createdById_idx" ON "LeaveTransaction"("createdById");

-- CreateIndex
CREATE INDEX "LeaveTransaction_type_idx" ON "LeaveTransaction"("type");

-- CreateIndex
CREATE INDEX "LeaveBalance_year_idx" ON "LeaveBalance"("year");

-- AddForeignKey
ALTER TABLE "LeaveTransaction" ADD CONSTRAINT "LeaveTransaction_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "LeaveBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveTransaction" ADD CONSTRAINT "LeaveTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveTransaction" ADD CONSTRAINT "LeaveTransaction_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveTransaction" ADD CONSTRAINT "LeaveTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
