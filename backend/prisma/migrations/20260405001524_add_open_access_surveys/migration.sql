-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_rotationScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_rotationSurveyId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_studentId_fkey";

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "isOpenAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SurveyResponse" ALTER COLUMN "assignmentId" DROP NOT NULL,
ALTER COLUMN "rotationSurveyId" DROP NOT NULL,
ALTER COLUMN "studentId" DROP NOT NULL,
ALTER COLUMN "rotationScheduleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SurveyAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_rotationSurveyId_fkey" FOREIGN KEY ("rotationSurveyId") REFERENCES "RotationSurvey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_rotationScheduleId_fkey" FOREIGN KEY ("rotationScheduleId") REFERENCES "RotationSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
