-- Catalog topics may still have practice attempts. AttemptAnswer does not
-- cascade from Question, so clear those rows before deleting the topics.
DELETE FROM "AttemptAnswer"
WHERE "questionId" IN (
  SELECT "Question"."id"
  FROM "Question"
  INNER JOIN "Topic" ON "Topic"."id" = "Question"."topicId"
  WHERE "Topic"."userId" IS NULL
);

DELETE FROM "Attempt"
WHERE "topicId" IN (
  SELECT "id" FROM "Topic" WHERE "userId" IS NULL
);

DELETE FROM "Topic" WHERE "userId" IS NULL;

DROP INDEX IF EXISTS "Topic_system_slug_key";

ALTER TABLE "Topic" ALTER COLUMN "userId" SET NOT NULL;
