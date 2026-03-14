-- Status fields on User (safe — already run but idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusEmoji" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusText" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusExpiresAt" TIMESTAMP(3);

-- usedAt on EmailToken (for password reset token consumption)
ALTER TABLE "EmailToken" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);

-- description + pinnedMessageId on Channel
ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "pinnedMessageId" TEXT;
