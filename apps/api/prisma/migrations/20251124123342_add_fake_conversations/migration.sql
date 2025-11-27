-- CreateTable
CREATE TABLE "conversation_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "conversation_type" TEXT NOT NULL,
    "chat_style" TEXT NOT NULL DEFAULT 'iphone',
    "background_type" TEXT,
    "background_url" TEXT,
    "video_settings" JSONB,
    "audio_settings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "estimated_cost" DECIMAL(10,4),
    "actual_cost" DECIMAL(10,4),
    "video_output_path" TEXT,
    "video_duration" DOUBLE PRECISION,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_characters" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "voice_id" TEXT,
    "voice_name" TEXT,
    "voice_config" JSONB,
    "message_color" TEXT,
    "is_user" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "delay" INTEGER NOT NULL DEFAULT 1000,
    "duration" DOUBLE PRECISION,
    "animation_type" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_generations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "prompt" TEXT NOT NULL,
    "generated_content" JSONB NOT NULL,
    "message_count" INTEGER NOT NULL,
    "estimated_duration" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_api_usage" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "prompt_length" INTEGER,
    "response_length" INTEGER,
    "cost_usd" DECIMAL(10,6),
    "response_time_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_projects_user_id_idx" ON "conversation_projects"("user_id");

-- CreateIndex
CREATE INDEX "conversation_projects_status_idx" ON "conversation_projects"("status");

-- CreateIndex
CREATE INDEX "conversation_projects_created_at_idx" ON "conversation_projects"("created_at");

-- CreateIndex
CREATE INDEX "conversation_characters_project_id_idx" ON "conversation_characters"("project_id");

-- CreateIndex
CREATE INDEX "conversation_characters_sort_order_idx" ON "conversation_characters"("sort_order");

-- CreateIndex
CREATE INDEX "conversation_messages_project_id_idx" ON "conversation_messages"("project_id");

-- CreateIndex
CREATE INDEX "conversation_messages_sort_order_idx" ON "conversation_messages"("sort_order");

-- CreateIndex
CREATE INDEX "conversation_messages_character_id_idx" ON "conversation_messages"("character_id");

-- CreateIndex
CREATE INDEX "conversation_generations_project_id_idx" ON "conversation_generations"("project_id");

-- CreateIndex
CREATE INDEX "conversation_generations_version_idx" ON "conversation_generations"("version");

-- CreateIndex
CREATE INDEX "conversation_generations_is_active_idx" ON "conversation_generations"("is_active");

-- CreateIndex
CREATE INDEX "conversation_api_usage_project_id_idx" ON "conversation_api_usage"("project_id");

-- CreateIndex
CREATE INDEX "conversation_api_usage_model_name_idx" ON "conversation_api_usage"("model_name");

-- CreateIndex
CREATE INDEX "conversation_api_usage_created_at_idx" ON "conversation_api_usage"("created_at");

-- AddForeignKey
ALTER TABLE "conversation_projects" ADD CONSTRAINT "conversation_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_characters" ADD CONSTRAINT "conversation_characters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "conversation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "conversation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "conversation_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_generations" ADD CONSTRAINT "conversation_generations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "conversation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_api_usage" ADD CONSTRAINT "conversation_api_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "conversation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
