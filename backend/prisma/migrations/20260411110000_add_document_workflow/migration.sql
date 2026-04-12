CREATE TYPE "DocumentSubjectType" AS ENUM ('INSTITUTION', 'STUDENT', 'TEACHER');

CREATE TYPE "DocumentWorkflowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "DocumentSlot" (
    "id" TEXT NOT NULL,
    "subjectType" "DocumentSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "documentType" "RequirementType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresExpiryDate" BOOLEAN NOT NULL DEFAULT false,
    "allowsMultipleFiles" BOOLEAN NOT NULL DEFAULT false,
    "institutionRequirementValueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" "DocumentWorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "textValue" TEXT,
    "dateValue" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentSlot_institutionRequirementValueId_key" ON "DocumentSlot"("institutionRequirementValueId");
CREATE UNIQUE INDEX "DocumentSlot_subjectType_subjectId_key_key" ON "DocumentSlot"("subjectType", "subjectId", "key");
CREATE INDEX "DocumentSlot_subjectType_subjectId_idx" ON "DocumentSlot"("subjectType", "subjectId");

CREATE UNIQUE INDEX "DocumentVersion_slotId_versionNumber_key" ON "DocumentVersion"("slotId", "versionNumber");
CREATE INDEX "DocumentVersion_slotId_isCurrent_idx" ON "DocumentVersion"("slotId", "isCurrent");
CREATE INDEX "DocumentVersion_status_idx" ON "DocumentVersion"("status");

ALTER TABLE "DocumentSlot" ADD CONSTRAINT "DocumentSlot_institutionRequirementValueId_fkey" FOREIGN KEY ("institutionRequirementValueId") REFERENCES "InstitutionRequirementValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "DocumentSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;