-- CreateTable
CREATE TABLE "video_generation_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_prompt" TEXT NOT NULL,
    "target_audience" TEXT,
    "script_length" TEXT,
    "tone" TEXT,
    "format" TEXT,
    "script_status" TEXT NOT NULL DEFAULT 'pending',
    "generated_script" JSONB,
    "script_project_id" TEXT,
    "voice_status" TEXT NOT NULL DEFAULT 'pending',
    "selected_voice" TEXT,
    "voice_speed" DOUBLE PRECISION DEFAULT 1.0,
    "voice_pitch" DOUBLE PRECISION DEFAULT 0,
    "audio_url" TEXT,
    "audio_duration" DOUBLE PRECISION,
    "video_status" TEXT NOT NULL DEFAULT 'pending',
    "selected_video_id" TEXT,
    "final_video_url" TEXT,
    "video_duration" DOUBLE PRECISION,
    "current_phase" INTEGER NOT NULL DEFAULT 1,
    "overallStatus" TEXT NOT NULL DEFAULT 'script_generation',
    "estimated_cost" DECIMAL(10,4),
    "actual_cost" DECIMAL(10,4),
    "error_message" TEXT,
    "processing_logs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_generation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_generation_projects_user_id_idx" ON "video_generation_projects"("user_id");

-- CreateIndex
CREATE INDEX "video_generation_projects_overallStatus_idx" ON "video_generation_projects"("overallStatus");

-- CreateIndex
CREATE INDEX "video_generation_projects_current_phase_idx" ON "video_generation_projects"("current_phase");

-- CreateIndex
CREATE INDEX "video_generation_projects_created_at_idx" ON "video_generation_projects"("created_at");

-- AddForeignKey
ALTER TABLE "video_generation_projects" ADD CONSTRAINT "video_generation_projects_selected_video_id_fkey" FOREIGN KEY ("selected_video_id") REFERENCES "library"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_generation_projects" ADD CONSTRAINT "video_generation_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
