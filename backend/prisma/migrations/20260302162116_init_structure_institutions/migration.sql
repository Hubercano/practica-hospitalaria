-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('FILE', 'TEXT', 'DATE', 'NUMBER');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EntityState" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "InstitutionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InstitutionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementDefinition" (
    "id" TEXT NOT NULL,
    "institutionTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RequirementType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresExpiryDate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RequirementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "typeId" TEXT NOT NULL,
    "state" "EntityState" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionRequirementValue" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
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

    CONSTRAINT "InstitutionRequirementValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionType_name_key" ON "InstitutionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_nit_key" ON "Institution"("nit");

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_institutionTypeId_fkey" FOREIGN KEY ("institutionTypeId") REFERENCES "InstitutionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "InstitutionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionRequirementValue" ADD CONSTRAINT "InstitutionRequirementValue_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionRequirementValue" ADD CONSTRAINT "InstitutionRequirementValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "RequirementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
