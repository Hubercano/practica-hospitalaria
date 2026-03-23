/*
  Warnings:

  - You are about to drop the `_AcademicProgramToRotationArea` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ClinicalServiceToRotationArea` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AcademicProgramToRotationArea" DROP CONSTRAINT "_AcademicProgramToRotationArea_A_fkey";

-- DropForeignKey
ALTER TABLE "_AcademicProgramToRotationArea" DROP CONSTRAINT "_AcademicProgramToRotationArea_B_fkey";

-- DropForeignKey
ALTER TABLE "_ClinicalServiceToRotationArea" DROP CONSTRAINT "_ClinicalServiceToRotationArea_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClinicalServiceToRotationArea" DROP CONSTRAINT "_ClinicalServiceToRotationArea_B_fkey";

-- AlterTable
ALTER TABLE "AcademicProgram" ADD COLUMN     "technicalAnnex" TEXT;

-- AlterTable
ALTER TABLE "RotationArea" ADD COLUMN     "durationWeeks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "programId" TEXT;

-- DropTable
DROP TABLE "_AcademicProgramToRotationArea";

-- DropTable
DROP TABLE "_ClinicalServiceToRotationArea";

-- AddForeignKey
ALTER TABLE "RotationArea" ADD CONSTRAINT "RotationArea_programId_fkey" FOREIGN KEY ("programId") REFERENCES "AcademicProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
