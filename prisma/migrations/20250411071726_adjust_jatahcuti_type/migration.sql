/*
  Warnings:

  - You are about to drop the column `cutiTerpakai` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `jatahCuti` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "cutiTerpakai",
DROP COLUMN "jatahCuti",
ADD COLUMN     "cutiterpakai" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jatahcuti" INTEGER NOT NULL DEFAULT 12;
