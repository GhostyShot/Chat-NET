ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "userCode" TEXT;

UPDATE "User"
SET "username" = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));

UPDATE "User"
SET "username" = CONCAT('user_', SUBSTRING(REPLACE(id, '-', '') FROM 1 FOR 4))
WHERE "username" = '';

UPDATE "User"
SET "username" = CONCAT("username", '_', SUBSTRING(REPLACE(id, '-', '') FROM 1 FOR 4))
WHERE EXISTS (
  SELECT 1
  FROM "User" u2
  WHERE u2."username" = "User"."username"
    AND u2.id <> "User".id
);

UPDATE "User"
SET "userCode" = UPPER(SUBSTRING(REPLACE(id, '-', '') FROM 1 FOR 6));

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "userCode" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");
