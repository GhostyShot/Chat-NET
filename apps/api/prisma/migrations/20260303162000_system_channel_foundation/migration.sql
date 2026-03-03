DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostingPolicy') THEN
    CREATE TYPE "PostingPolicy" AS ENUM ('ALL_MEMBERS', 'ADMINS_ONLY', 'OWNER_ONLY');
  END IF;
END $$;

ALTER TABLE "Channel"
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "systemKey" TEXT,
  ADD COLUMN IF NOT EXISTS "postingPolicy" "PostingPolicy" NOT NULL DEFAULT 'ALL_MEMBERS';

CREATE UNIQUE INDEX IF NOT EXISTS "Channel_systemKey_key" ON "Channel"("systemKey");

DO $$
DECLARE
  owner_id TEXT;
  system_channel_id TEXT;
BEGIN
  SELECT id INTO owner_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

  IF owner_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO system_channel_id FROM "Channel" WHERE "systemKey" = 'SYSTEM_NEWS' LIMIT 1;

  IF system_channel_id IS NULL THEN
    INSERT INTO "Channel" ("type", "name", "isSystem", "systemKey", "postingPolicy", "createdById")
    VALUES ('GROUP', 'Systemnachrichten', true, 'SYSTEM_NEWS', 'OWNER_ONLY', owner_id)
    RETURNING id INTO system_channel_id;
  END IF;

  INSERT INTO "ChannelMembership" ("userId", "channelId", "role")
  SELECT u.id, system_channel_id,
    CASE WHEN u.id = owner_id THEN 'OWNER'::"MembershipRole" ELSE 'MEMBER'::"MembershipRole" END
  FROM "User" u
  ON CONFLICT ("userId", "channelId") DO NOTHING;
END $$;
