CREATE TYPE "SegmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "RecordingSegment" (
    "id" SERIAL NOT NULL,
    "porteId" INTEGER NOT NULL,
    "commercialId" INTEGER,
    "managerId" INTEGER,
    "immeubleId" INTEGER,
    "s3KeyOriginal" TEXT NOT NULL,
    "s3KeySegment" TEXT,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "transcription" TEXT,
    "speechScore" INTEGER,
    "status" "SegmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordingSegment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecordingSegment_porteId_idx" ON "RecordingSegment"("porteId");

CREATE INDEX "RecordingSegment_commercialId_idx" ON "RecordingSegment"("commercialId");

CREATE INDEX "RecordingSegment_immeubleId_idx" ON "RecordingSegment"("immeubleId");

CREATE INDEX "RecordingSegment_s3KeyOriginal_idx" ON "RecordingSegment"("s3KeyOriginal");

CREATE INDEX "RecordingSegment_status_idx" ON "RecordingSegment"("status");

ALTER TABLE "RecordingSegment" ADD CONSTRAINT "RecordingSegment_porteId_fkey" FOREIGN KEY ("porteId") REFERENCES "Porte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
