-- AlterTable
ALTER TABLE "Question" ADD COLUMN "sourceFingerprint" TEXT;
ALTER TABLE "Question" ADD COLUMN "generationId" TEXT;

-- CreateIndex
CREATE INDEX "Question_topicId_sourceFingerprint_generationId_idx" ON "Question"("topicId", "sourceFingerprint", "generationId");
