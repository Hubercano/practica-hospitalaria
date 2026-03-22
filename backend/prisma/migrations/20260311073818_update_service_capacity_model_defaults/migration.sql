/*
  Warnings:

  - You are about to drop the column `capacity` on the `ServiceCapacity` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `ServiceCapacity` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ServiceCapacity" DROP CONSTRAINT "ServiceCapacity_serviceId_fkey";

-- AlterTable
ALTER TABLE "ServiceCapacity" DROP COLUMN "capacity",
DROP COLUMN "serviceId",
ADD COLUMN     "capacityQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "concept" TEXT,
ADD COLUMN     "headquarters" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "headquartersName" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "distinctiveCode" DROP NOT NULL;

-- CreateTable
CREATE TABLE "_ClinicalServiceToServiceCapacity" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ClinicalServiceToServiceCapacity_AB_unique" ON "_ClinicalServiceToServiceCapacity"("A", "B");

-- CreateIndex
CREATE INDEX "_ClinicalServiceToServiceCapacity_B_index" ON "_ClinicalServiceToServiceCapacity"("B");

-- AddForeignKey
ALTER TABLE "_ClinicalServiceToServiceCapacity" ADD CONSTRAINT "_ClinicalServiceToServiceCapacity_A_fkey" FOREIGN KEY ("A") REFERENCES "ClinicalService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicalServiceToServiceCapacity" ADD CONSTRAINT "_ClinicalServiceToServiceCapacity_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceCapacity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
