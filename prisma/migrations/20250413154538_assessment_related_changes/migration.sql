-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('video', 'text', 'assessment');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "type" "LessonType" NOT NULL DEFAULT 'text';
