/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `courses` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_module_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_module_id_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "courses_title_key" ON "courses"("title");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
