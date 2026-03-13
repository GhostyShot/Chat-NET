-- Add custom status fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusEmoji" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusText" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusExpiresAt" TIMESTAMP(3);

-- Add description to Channel
ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "description" TEXT;
