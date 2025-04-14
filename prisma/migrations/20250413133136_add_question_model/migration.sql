/*
  Warnings:

  - You are about to drop the column `assessment_id` on the `assessment_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `assessment_id` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `question_type` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the `assessments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `module_id` to the `assessment_attempts` table without a default value. This is not possible if the table is not empty.
  - Made the column `answers` on table `assessment_attempts` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `difficulty` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module_id` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Made the column `options` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `correct_answer` on table `questions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- DropForeignKey
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_module_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_assessment_id_fkey";

-- AlterTable
ALTER TABLE "assessment_attempts" DROP COLUMN "assessment_id",
ADD COLUMN     "module_id" INTEGER NOT NULL,
ADD COLUMN     "passed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questionIds" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "answers" SET NOT NULL;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "assessment_id",
DROP COLUMN "points",
DROP COLUMN "position",
DROP COLUMN "question_type",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficulty" "QuestionDifficulty" NOT NULL,
ADD COLUMN     "module_id" INTEGER NOT NULL,
ALTER COLUMN "options" SET NOT NULL,
ALTER COLUMN "correct_answer" SET NOT NULL;

-- DropTable
DROP TABLE "assessments";

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
