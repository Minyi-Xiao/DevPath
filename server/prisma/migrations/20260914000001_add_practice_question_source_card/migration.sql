-- AlterTable
ALTER TABLE "Question" ADD COLUMN "sourceCardId" TEXT;

-- CreateIndex
CREATE INDEX "Question_sourceCardId_idx" ON "Question"("sourceCardId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sourceCardId_fkey" FOREIGN KEY ("sourceCardId") REFERENCES "LearningCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
