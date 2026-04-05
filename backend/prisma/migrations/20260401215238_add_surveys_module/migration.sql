-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'DROPDOWN');

-- CreateEnum
CREATE TYPE "SurveyAssignmentStatus" AS ENUM ('PENDING', 'RESPONDED');

-- CreateEnum
CREATE TYPE "SurveyDispatchChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "SurveyDispatchStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'INACTIVE',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "SurveyQuestionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "scaleStep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationSurvey" (
    "id" TEXT NOT NULL,
    "rotationScheduleId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "status" "EntityState" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendAfterRotationEnd" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RotationSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAssignment" (
    "id" TEXT NOT NULL,
    "rotationSurveyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "SurveyAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "firstSentAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDispatchLog" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "channel" "SurveyDispatchChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "SurveyDispatchStatus" NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "rotationSurveyId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rotationScheduleId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponseDetail" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "answerNumber" DOUBLE PRECISION,
    "answerOptionsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponseDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyId_orderIndex_idx" ON "SurveyQuestion"("surveyId", "orderIndex");

-- CreateIndex
CREATE INDEX "SurveyQuestionOption_questionId_orderIndex_idx" ON "SurveyQuestionOption"("questionId", "orderIndex");

-- CreateIndex
CREATE INDEX "RotationSurvey_surveyId_idx" ON "RotationSurvey"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "RotationSurvey_rotationScheduleId_key" ON "RotationSurvey"("rotationScheduleId");

-- CreateIndex
CREATE INDEX "SurveyAssignment_status_respondedAt_idx" ON "SurveyAssignment"("status", "respondedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAssignment_rotationSurveyId_studentId_key" ON "SurveyAssignment"("rotationSurveyId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAssignment_tokenHash_key" ON "SurveyAssignment"("tokenHash");

-- CreateIndex
CREATE INDEX "SurveyDispatchLog_assignmentId_dispatchedAt_idx" ON "SurveyDispatchLog"("assignmentId", "dispatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_assignmentId_key" ON "SurveyResponse"("assignmentId");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_submittedAt_idx" ON "SurveyResponse"("surveyId", "submittedAt");

-- CreateIndex
CREATE INDEX "SurveyResponse_rotationScheduleId_submittedAt_idx" ON "SurveyResponse"("rotationScheduleId", "submittedAt");

-- CreateIndex
CREATE INDEX "SurveyResponseDetail_questionId_idx" ON "SurveyResponseDetail"("questionId");

-- CreateIndex
CREATE INDEX "SurveyResponseDetail_responseId_idx" ON "SurveyResponseDetail"("responseId");

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestionOption" ADD CONSTRAINT "SurveyQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationSurvey" ADD CONSTRAINT "RotationSurvey_rotationScheduleId_fkey" FOREIGN KEY ("rotationScheduleId") REFERENCES "RotationSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationSurvey" ADD CONSTRAINT "RotationSurvey_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_rotationSurveyId_fkey" FOREIGN KEY ("rotationSurveyId") REFERENCES "RotationSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAssignment" ADD CONSTRAINT "SurveyAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDispatchLog" ADD CONSTRAINT "SurveyDispatchLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SurveyAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SurveyAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_rotationSurveyId_fkey" FOREIGN KEY ("rotationSurveyId") REFERENCES "RotationSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_rotationScheduleId_fkey" FOREIGN KEY ("rotationScheduleId") REFERENCES "RotationSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponseDetail" ADD CONSTRAINT "SurveyResponseDetail_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponseDetail" ADD CONSTRAINT "SurveyResponseDetail_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
