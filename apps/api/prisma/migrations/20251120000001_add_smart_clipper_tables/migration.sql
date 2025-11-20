-- CreateTable
CREATE TABLE "smart_clipper_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'analyzing',
    "config" JSONB NOT NULL,
    "analysis_results" JSONB,
    "processing_stage" TEXT DEFAULT 'preprocessing',
    "gemini_flash_results" JSONB,
    "gemini_pro_results" JSONB,
    "embedding_scores" JSONB,
    "total_segments_found" INTEGER DEFAULT 0,
    "estimated_cost" DECIMAL(10,4),
    "actual_cost" DECIMAL(10,4),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_clipper_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "highlight_segments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "flash_score" INTEGER,
    "pro_score" INTEGER NOT NULL,
    "embedding_score" DOUBLE PRECISION,
    "final_score" INTEGER NOT NULL,
    "confidence_level" DOUBLE PRECISION NOT NULL,
    "highlight_type" TEXT,
    "reasoning" TEXT NOT NULL,
    "gemini_classification" TEXT,
    "content_tags" TEXT[],
    "audio_energy_avg" DOUBLE PRECISION,
    "silence_ratio" DOUBLE PRECISION,
    "scene_changes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "user_approval" TEXT,
    "custom_start_time" DOUBLE PRECISION,
    "custom_end_time" DOUBLE PRECISION,
    "output_path" TEXT,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highlight_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_type_configs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "audio_energy_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "visual_motion_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "speech_pattern_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "scene_change_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "excitement_keywords" TEXT[],
    "action_keywords" TEXT[],
    "emotional_keywords" TEXT[],
    "technical_keywords" TEXT[],
    "min_clip_length" INTEGER NOT NULL DEFAULT 15,
    "max_clip_length" INTEGER NOT NULL DEFAULT 90,
    "preferred_clip_length" INTEGER NOT NULL DEFAULT 45,
    "max_segments" INTEGER NOT NULL DEFAULT 10,
    "minimum_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "gemini_flash_prompt_template" TEXT NOT NULL,
    "gemini_pro_prompt_template" TEXT NOT NULL,
    "embedding_query_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_feedback" (
    "id" TEXT NOT NULL,
    "segment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feedback_type" TEXT NOT NULL,
    "rating" INTEGER,
    "custom_start_time" DOUBLE PRECISION,
    "custom_end_time" DOUBLE PRECISION,
    "feedback_notes" TEXT,
    "improvement_suggestions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gemini_api_usage" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "video_duration_seconds" DOUBLE PRECISION,
    "cost_usd" DECIMAL(10,6),
    "response_time_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gemini_api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_type_configs_type_key" ON "content_type_configs"("type");

-- CreateIndex
CREATE INDEX "smart_clipper_projects_user_id_idx" ON "smart_clipper_projects"("user_id");
CREATE INDEX "smart_clipper_projects_video_id_idx" ON "smart_clipper_projects"("video_id");
CREATE INDEX "smart_clipper_projects_status_idx" ON "smart_clipper_projects"("status");

-- CreateIndex
CREATE INDEX "highlight_segments_project_id_idx" ON "highlight_segments"("project_id");
CREATE INDEX "highlight_segments_final_score_idx" ON "highlight_segments"("final_score");
CREATE INDEX "highlight_segments_status_idx" ON "highlight_segments"("status");

-- CreateIndex
CREATE INDEX "segment_feedback_segment_id_idx" ON "segment_feedback"("segment_id");
CREATE INDEX "segment_feedback_user_id_idx" ON "segment_feedback"("user_id");

-- CreateIndex
CREATE INDEX "gemini_api_usage_project_id_idx" ON "gemini_api_usage"("project_id");
CREATE INDEX "gemini_api_usage_model_name_idx" ON "gemini_api_usage"("model_name");
CREATE INDEX "gemini_api_usage_created_at_idx" ON "gemini_api_usage"("created_at");

-- AddForeignKey
ALTER TABLE "smart_clipper_projects" ADD CONSTRAINT "smart_clipper_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_clipper_projects" ADD CONSTRAINT "smart_clipper_projects_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlight_segments" ADD CONSTRAINT "highlight_segments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "smart_clipper_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_feedback" ADD CONSTRAINT "segment_feedback_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "highlight_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_feedback" ADD CONSTRAINT "segment_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_usage" ADD CONSTRAINT "gemini_api_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "smart_clipper_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;