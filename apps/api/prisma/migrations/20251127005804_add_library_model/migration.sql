-- CreateTable
CREATE TABLE "library" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration" DOUBLE PRECISION,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "category" TEXT DEFAULT 'gameplay',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "upload_source" TEXT DEFAULT 'upload',
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_user_id_idx" ON "library"("user_id");

-- CreateIndex
CREATE INDEX "library_category_idx" ON "library"("category");

-- CreateIndex
CREATE INDEX "library_status_idx" ON "library"("status");

-- CreateIndex
CREATE INDEX "library_is_public_idx" ON "library"("is_public");

-- CreateIndex
CREATE INDEX "library_created_at_idx" ON "library"("created_at");

-- AddForeignKey
ALTER TABLE "library" ADD CONSTRAINT "library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
