-- AlterTable
ALTER TABLE "Document" ADD COLUMN "analysisProgress" JSONB;

-- AlterTable
DROP INDEX IF EXISTS "Attempt_submissionId_key";
CREATE UNIQUE INDEX "Attempt_userId_submissionId_key" ON "Attempt"("userId", "submissionId");
