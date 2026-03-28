-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "teacherRecognitionFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teacherTrainingFiles" TEXT[] DEFAULT ARRAY[]::TEXT[];
