-- AlterTable
ALTER TABLE "RotationArea" ADD COLUMN     "serviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "RotationSchedule" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "programId" TEXT,
    "areaId" TEXT,
    "teacherIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "studentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StudentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRequirementDefinition" (
    "id" TEXT NOT NULL,
    "studentTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RequirementType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresExpiryDate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StudentRequirementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "typeId" TEXT NOT NULL,
    "state" "EntityState" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRequirementValue" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRequirementValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "supervisionType" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "cvFile" TEXT,
    "dataAuthorizationFile" TEXT,
    "conflictOfInterestFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClinicalServiceToRotationArea" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentType_name_key" ON "StudentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_document_key" ON "Student"("document");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_document_key" ON "Teacher"("document");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_ClinicalServiceToRotationArea_AB_unique" ON "_ClinicalServiceToRotationArea"("A", "B");

-- CreateIndex
CREATE INDEX "_ClinicalServiceToRotationArea_B_index" ON "_ClinicalServiceToRotationArea"("B");

-- AddForeignKey
ALTER TABLE "StudentRequirementDefinition" ADD CONSTRAINT "StudentRequirementDefinition_studentTypeId_fkey" FOREIGN KEY ("studentTypeId") REFERENCES "StudentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "StudentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRequirementValue" ADD CONSTRAINT "StudentRequirementValue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRequirementValue" ADD CONSTRAINT "StudentRequirementValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "StudentRequirementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicalServiceToRotationArea" ADD CONSTRAINT "_ClinicalServiceToRotationArea_A_fkey" FOREIGN KEY ("A") REFERENCES "ClinicalService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClinicalServiceToRotationArea" ADD CONSTRAINT "_ClinicalServiceToRotationArea_B_fkey" FOREIGN KEY ("B") REFERENCES "RotationArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
