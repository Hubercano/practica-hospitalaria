/*
  Warnings:

  - You are about to drop the column `expirationDate` on the `RequirementDefinition` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RequirementDefinition" DROP COLUMN "expirationDate";

-- CreateTable
CREATE TABLE "AcademicProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AcademicProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalService" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCapacity" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "distinctiveCode" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "capacityGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AcademicProgramToRotationArea" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ClinicalServiceToRotationArea" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalService_code_key" ON "ClinicalService"("code");

-- CreateIndex
CREATE UNIQUE INDEX "_AcademicProgramToRotationArea_AB_unique" ON "_AcademicProgramToRotationArea"("A", "B");

-- CreateIndex
CREATE INDEX "_AcademicProgramToRotationArea_B_index" ON "_AcademicProgramToRotationArea"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ClinicalServiceToRotationArea_AB_unique" ON "_ClinicalServiceToRotationArea"("A", "B");

-- CreateIndex
CREATE INDEX "_ClinicalServiceToRotationArea_B_index" ON "_ClinicalServiceToRotationArea"("B");

-- AddForeignKey
ALTER TABLE "AcademicProgram" ADD CONSTRAINT "AcademicProgram_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCapacity" ADD CONSTRAINT "ServiceCapacity_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ClinicalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AcademicProgramToRotationArea" ADD CONSTRAINT "_AcademicProgramToRotationArea_A_fkey" FOREIGN KEY ("A") REFERENCES "AcademicProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AcademicProgramToRotationArea" ADD CONSTRAINT "_AcademicProgramToRotationArea_B_fkey" FOREIGN KEY ("B") REFERENCES "RotationArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicalServiceToRotationArea" ADD CONSTRAINT "_ClinicalServiceToRotationArea_A_fkey" FOREIGN KEY ("A") REFERENCES "ClinicalService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicalServiceToRotationArea" ADD CONSTRAINT "_ClinicalServiceToRotationArea_B_fkey" FOREIGN KEY ("B") REFERENCES "RotationArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
