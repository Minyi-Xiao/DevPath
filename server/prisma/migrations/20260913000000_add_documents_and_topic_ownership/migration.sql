-- AlterTable
ALTER TABLE "Topic" ADD COLUMN "userId" TEXT;

-- DropIndex
DROP INDEX "Topic_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Topic_userId_slug_key" ON "Topic"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_system_slug_key" ON "Topic"("slug") WHERE "userId" IS NULL;

-- CreateIndex
CREATE INDEX "Topic_userId_idx" ON "Topic"("userId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'ANALYZING', 'REVIEW_PENDING', 'SAVED', 'FAILED', 'DISCARDED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "extractedChars" INTEGER,
    "status" "DocumentStatus" NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "summary" TEXT,
    "keyPoints" JSONB,
    "draftCards" JSONB,
    "suggestedTopicName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_topicId_idx" ON "Document"("topicId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "LearningCard" ADD COLUMN "documentId" TEXT;
ALTER TABLE "LearningCard" ADD COLUMN "sourceRef" TEXT;

-- CreateIndex
CREATE INDEX "LearningCard_documentId_idx" ON "LearningCard"("documentId");

-- AddForeignKey
ALTER TABLE "LearningCard" ADD CONSTRAINT "LearningCard_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
