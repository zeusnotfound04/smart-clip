/*
  Warnings:

  - You are about to drop the column `is_public` on the `library` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `library` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "library" DROP CONSTRAINT "library_user_id_fkey";

-- DropIndex
DROP INDEX "library_is_public_idx";

-- DropIndex
DROP INDEX "library_user_id_idx";

-- AlterTable
ALTER TABLE "library" DROP COLUMN "is_public",
DROP COLUMN "user_id",
ALTER COLUMN "upload_source" SET DEFAULT 'seeded';
