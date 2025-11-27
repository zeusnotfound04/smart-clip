-- CreateTable
CREATE TABLE "script_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_prompt" TEXT NOT NULL,
    "target_audience" TEXT,
    "script_length" TEXT,
    "tone" TEXT,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "estimated_cost" DECIMAL(10,4),
    "actual_cost" DECIMAL(10,4),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_scripts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "structured_content" JSONB,
    "hook" TEXT,
    "key_points" TEXT[],
    "conclusion" TEXT,
    "word_count" INTEGER,
    "estimated_duration" INTEGER,
    "confidence" DOUBLE PRECISION,
    "user_rating" INTEGER,
    "user_feedback" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_api_usage" (
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

    CONSTRAINT "script_api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "script_projects_user_id_idx" ON "script_projects"("user_id");

-- CreateIndex
CREATE INDEX "script_projects_status_idx" ON "script_projects"("status");

-- CreateIndex
CREATE INDEX "script_projects_created_at_idx" ON "script_projects"("created_at");

-- CreateIndex
CREATE INDEX "generated_scripts_project_id_idx" ON "generated_scripts"("project_id");

-- CreateIndex
CREATE INDEX "generated_scripts_version_idx" ON "generated_scripts"("version");

-- CreateIndex
CREATE INDEX "generated_scripts_is_active_idx" ON "generated_scripts"("is_active");

-- CreateIndex
CREATE INDEX "script_api_usage_project_id_idx" ON "script_api_usage"("project_id");

-- CreateIndex
CREATE INDEX "script_api_usage_model_name_idx" ON "script_api_usage"("model_name");

-- CreateIndex
CREATE INDEX "script_api_usage_created_at_idx" ON "script_api_usage"("created_at");

-- AddForeignKey
ALTER TABLE "script_projects" ADD CONSTRAINT "script_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_scripts" ADD CONSTRAINT "generated_scripts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "script_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_api_usage" ADD CONSTRAINT "script_api_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "script_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
