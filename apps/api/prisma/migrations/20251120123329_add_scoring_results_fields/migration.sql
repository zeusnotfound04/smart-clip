-- AlterTable
ALTER TABLE "smart_clipper_projects" ADD COLUMN     "last_feedback_processed" TIMESTAMP(3),
ADD COLUMN     "scoring_results" JSONB;
