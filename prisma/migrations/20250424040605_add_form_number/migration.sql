/*
  Warnings:

  - A unique constraint covering the columns `[formNumber]` on the table `Form` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "formNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Form_formNumber_key" ON "Form"("formNumber");
