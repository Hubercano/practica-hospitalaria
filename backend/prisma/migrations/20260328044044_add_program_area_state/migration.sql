-- AlterTable
ALTER TABLE "AcademicProgram" ADD COLUMN     "state" "EntityState" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "RotationArea" ADD COLUMN     "state" "EntityState" NOT NULL DEFAULT 'ACTIVE';
