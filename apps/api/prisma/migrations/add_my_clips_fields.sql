-- Add new fields to Video table for My Clips feature
-- Migration: Add title, description, tags, isFavorite, usageCount, lastUsedAt

-- Add new columns
ALTER TABLE "videos" 
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "is_favorite" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "usage_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "videos_user_id_idx" ON "videos"("user_id");
CREATE INDEX IF NOT EXISTS "videos_is_favorite_idx" ON "videos"("is_favorite");
CREATE INDEX IF NOT EXISTS "videos_created_at_idx" ON "videos"("created_at");

-- Optional: Set title from originalName for existing videos
UPDATE "videos" 
SET "title" = "original_name" 
WHERE "title" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN "videos"."title" IS 'User-friendly name for My Clips';
COMMENT ON COLUMN "videos"."description" IS 'Optional description for the clip';
COMMENT ON COLUMN "videos"."tags" IS 'Array of tags for categorization';
COMMENT ON COLUMN "videos"."is_favorite" IS 'Whether the clip is marked as favorite';
COMMENT ON COLUMN "videos"."usage_count" IS 'Number of times clip has been reused';
COMMENT ON COLUMN "videos"."last_used_at" IS 'Timestamp of last reuse';
