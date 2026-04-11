DO $$
BEGIN
    CREATE TYPE "CounterpartStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CounterpartRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" TEXT NOT NULL,
    "status" "CounterpartStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "respondedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "institutionSeenAt" TIMESTAMP(3),
    "hospitalSeenAt" TIMESTAMP(3),
    CONSTRAINT "CounterpartRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CounterpartResponse" (
    "id" TEXT NOT NULL,
    "counterpartRequestId" TEXT NOT NULL,
    "status" "CounterpartStatus" NOT NULL,
    "valueWithoutDiscount" DOUBLE PRECISION,
    "discountPercentage" DOUBLE PRECISION,
    "valueWithDiscount" DOUBLE PRECISION,
    "respondedByUserId" TEXT,
    "responseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CounterpartResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CounterpartRequest_institutionId_status_idx" ON "CounterpartRequest"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "CounterpartRequest_institutionSeenAt_idx" ON "CounterpartRequest"("institutionSeenAt");
CREATE INDEX IF NOT EXISTS "CounterpartRequest_hospitalSeenAt_idx" ON "CounterpartRequest"("hospitalSeenAt");
CREATE INDEX IF NOT EXISTS "CounterpartRequest_createdAt_idx" ON "CounterpartRequest"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CounterpartResponse_counterpartRequestId_key" ON "CounterpartResponse"("counterpartRequestId");
CREATE INDEX IF NOT EXISTS "CounterpartResponse_status_responseDate_idx" ON "CounterpartResponse"("status", "responseDate");

DO $$
BEGIN
    ALTER TABLE "CounterpartRequest"
        ADD CONSTRAINT "CounterpartRequest_institutionId_fkey"
        FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "CounterpartResponse"
        ADD CONSTRAINT "CounterpartResponse_counterpartRequestId_fkey"
        FOREIGN KEY ("counterpartRequestId") REFERENCES "CounterpartRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;