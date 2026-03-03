-- Add fields for lesson plan (รหัสแผนการสอน, ประเภทแผนการสอน, ห้อง, ภาคเรียนที่)
-- Run once if your DB already has lessonplan table without these columns.
-- MySQL: run each ALTER separately; if column already exists, that statement will error (safe to skip).

ALTER TABLE `lessonplan` ADD COLUMN `code` VARCHAR(191) NULL;
ALTER TABLE `lessonplan` ADD COLUMN `planType` VARCHAR(191) NULL;
ALTER TABLE `lessonplan` ADD COLUMN `room` VARCHAR(191) NULL;
ALTER TABLE `lessonplan` ADD COLUMN `semester` INT NULL;
