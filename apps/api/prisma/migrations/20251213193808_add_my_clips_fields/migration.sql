-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT,
ADD COLUMN     "usage_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "videos_user_id_idx" ON "videos"("user_id");

-- CreateIndex
CREATE INDEX "videos_is_favorite_idx" ON "videos"("is_favorite");

-- CreateIndex
CREATE INDEX "videos_created_at_idx" ON "videos"("created_at");
