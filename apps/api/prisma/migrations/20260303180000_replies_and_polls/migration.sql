ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Message_replyToId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_replyToId_fkey"
      FOREIGN KEY ("replyToId") REFERENCES "Message"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Message_replyToId_idx" ON "Message"("replyToId");

CREATE TABLE IF NOT EXISTS "Poll" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollVote" (
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PollVote_pkey" PRIMARY KEY ("pollId", "userId")
);

CREATE INDEX IF NOT EXISTS "Poll_channelId_createdAt_idx" ON "Poll"("channelId", "createdAt");
CREATE INDEX IF NOT EXISTS "PollOption_pollId_idx" ON "PollOption"("pollId");
CREATE INDEX IF NOT EXISTS "PollVote_optionId_idx" ON "PollVote"("optionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Poll_channelId_fkey'
  ) THEN
    ALTER TABLE "Poll"
      ADD CONSTRAINT "Poll_channelId_fkey"
      FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Poll_creatorId_fkey'
  ) THEN
    ALTER TABLE "Poll"
      ADD CONSTRAINT "Poll_creatorId_fkey"
      FOREIGN KEY ("creatorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PollOption_pollId_fkey'
  ) THEN
    ALTER TABLE "PollOption"
      ADD CONSTRAINT "PollOption_pollId_fkey"
      FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PollVote_pollId_fkey'
  ) THEN
    ALTER TABLE "PollVote"
      ADD CONSTRAINT "PollVote_pollId_fkey"
      FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PollVote_optionId_fkey'
  ) THEN
    ALTER TABLE "PollVote"
      ADD CONSTRAINT "PollVote_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "PollOption"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PollVote_userId_fkey'
  ) THEN
    ALTER TABLE "PollVote"
      ADD CONSTRAINT "PollVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
