CREATE TABLE IF NOT EXISTS "TeachingServiceCommittee" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "committeeNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "fileUrl" TEXT,
    "originalFileName" TEXT,
    "extraField" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "TeachingServiceCommittee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeachingServiceCommittee_institutionId_year_committeeNumber_key"
ON "TeachingServiceCommittee"("institutionId", "year", "committeeNumber");

CREATE INDEX IF NOT EXISTS "TeachingServiceCommittee_year_institutionId_idx"
ON "TeachingServiceCommittee"("year", "institutionId");

DO $$
BEGIN
    ALTER TABLE "TeachingServiceCommittee"
        ADD CONSTRAINT "TeachingServiceCommittee_institutionId_fkey"
        FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;