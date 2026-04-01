-- CreateEnum
CREATE TYPE "InductionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InductionLinkMode" AS ENUM ('PERMANENT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "InductionExpiryPolicy" AS ENUM ('FIXED_END_DATE', 'DAYS_FROM_COMPLETION');

-- CreateEnum
CREATE TYPE "InductionChannel" AS ENUM ('QR_PUBLIC', 'ADMIN_MANUAL');

-- CreateTable
CREATE TABLE "Induction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InductionStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "expiryPolicy" "InductionExpiryPolicy" NOT NULL DEFAULT 'FIXED_END_DATE',
    "expiryDays" INTEGER,
    "linkMode" "InductionLinkMode" NOT NULL DEFAULT 'TEMPORARY',
    "publicSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Induction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InductionAccessToken" (
    "id" TEXT NOT NULL,
    "inductionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InductionAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InductionAllowedStudent" (
    "id" TEXT NOT NULL,
    "inductionId" TEXT NOT NULL,
    "studentId" TEXT,
    "document" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InductionAllowedStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InductionAttendance" (
    "id" TEXT NOT NULL,
    "inductionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentSnapshot" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "channel" "InductionChannel" NOT NULL DEFAULT 'QR_PUBLIC',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InductionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InductionAuditEvent" (
    "id" TEXT NOT NULL,
    "inductionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InductionAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Induction_publicSlug_key" ON "Induction"("publicSlug");

-- CreateIndex
CREATE INDEX "Induction_status_startAt_endAt_idx" ON "Induction"("status", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "InductionAccessToken_tokenHash_key" ON "InductionAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InductionAccessToken_inductionId_isRevoked_expiresAt_idx" ON "InductionAccessToken"("inductionId", "isRevoked", "expiresAt");

-- CreateIndex
CREATE INDEX "InductionAllowedStudent_studentId_idx" ON "InductionAllowedStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "InductionAllowedStudent_inductionId_document_key" ON "InductionAllowedStudent"("inductionId", "document");

-- CreateIndex
CREATE INDEX "InductionAttendance_studentId_expiresAt_idx" ON "InductionAttendance"("studentId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InductionAttendance_inductionId_studentId_key" ON "InductionAttendance"("inductionId", "studentId");

-- CreateIndex
CREATE INDEX "InductionAuditEvent_inductionId_eventType_idx" ON "InductionAuditEvent"("inductionId", "eventType");

-- AddForeignKey
ALTER TABLE "InductionAccessToken" ADD CONSTRAINT "InductionAccessToken_inductionId_fkey" FOREIGN KEY ("inductionId") REFERENCES "Induction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InductionAllowedStudent" ADD CONSTRAINT "InductionAllowedStudent_inductionId_fkey" FOREIGN KEY ("inductionId") REFERENCES "Induction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InductionAllowedStudent" ADD CONSTRAINT "InductionAllowedStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InductionAttendance" ADD CONSTRAINT "InductionAttendance_inductionId_fkey" FOREIGN KEY ("inductionId") REFERENCES "Induction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InductionAttendance" ADD CONSTRAINT "InductionAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InductionAuditEvent" ADD CONSTRAINT "InductionAuditEvent_inductionId_fkey" FOREIGN KEY ("inductionId") REFERENCES "Induction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
