/*
  Warnings:

  - A unique constraint covering the columns `[formId,role]` on the table `Approval` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Approval_formId_role_key" ON "Approval"("formId", "role");
