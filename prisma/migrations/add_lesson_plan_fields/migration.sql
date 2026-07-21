-- Add fields for lesson plan (already applied via LESSON_PLAN_ADD_COLUMNS.sql or schema)
-- AlterTable
ALTER TABLE `lessonplan` ADD COLUMN `code` VARCHAR(191) NULL;
ALTER TABLE `lessonplan` ADD COLUMN `planType` VARCHAR(191) NULL;
ALTER TABLE `lessonplan` ADD COLUMN `room` VARCHAR(191) NULL;
ALTER TABLE `lessonplan` ADD COLUMN `semester` INT NULL;
