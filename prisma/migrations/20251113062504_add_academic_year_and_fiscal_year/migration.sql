-- Step 1: Add columns with default values (temporary)
ALTER TABLE `evidence` ADD COLUMN `academicYear` INTEGER NOT NULL DEFAULT 2568;
ALTER TABLE `lessonplan` ADD COLUMN `fiscalYear` INTEGER NOT NULL DEFAULT 2568;
ALTER TABLE `teachingmedia` ADD COLUMN `fiscalYear` INTEGER NOT NULL DEFAULT 2568;

-- Step 2: Update existing data
-- For Evidence: Calculate academicYear from fiscalYear (they were the same before)
-- Since fiscalYear was storing academic year, we can copy it
UPDATE `evidence` SET `academicYear` = `fiscalYear` WHERE `academicYear` = 2568;

-- For TeachingMedia: Calculate fiscalYear from academicYear
-- If academicYear is 2567 (May 2024 - Apr 2025), fiscalYear should be 2567 (Oct 2023 - Sep 2024) or 2568 (Oct 2024 - Sep 2025)
-- We'll use a simple calculation: if academicYear >= 2567, fiscalYear = academicYear (same year)
-- This is a reasonable default for most cases
UPDATE `teachingmedia` SET `fiscalYear` = `academicYear` WHERE `fiscalYear` = 2568;

-- For LessonPlan: Calculate fiscalYear from academicYear (same logic as TeachingMedia)
UPDATE `lessonplan` SET `fiscalYear` = `academicYear` WHERE `fiscalYear` = 2568;

-- Step 3: Remove default values (make columns truly required)
ALTER TABLE `evidence` MODIFY COLUMN `academicYear` INTEGER NOT NULL;
ALTER TABLE `lessonplan` MODIFY COLUMN `fiscalYear` INTEGER NOT NULL;
ALTER TABLE `teachingmedia` MODIFY COLUMN `fiscalYear` INTEGER NOT NULL;

-- Step 4: Create indexes
CREATE INDEX `evidence_schoolId_academicYear_indicatorId_status_idx` ON `evidence`(`schoolId`, `academicYear`, `indicatorId`, `status`);
CREATE INDEX `lessonplan_schoolId_fiscalYear_idx` ON `lessonplan`(`schoolId`, `fiscalYear`);
CREATE INDEX `lessonplan_schoolId_fiscalYear_status_idx` ON `lessonplan`(`schoolId`, `fiscalYear`, `status`);
CREATE INDEX `teachingmedia_schoolId_fiscalYear_indicatorId_idx` ON `teachingmedia`(`schoolId`, `fiscalYear`, `indicatorId`);
CREATE INDEX `teachingmedia_schoolId_fiscalYear_idx` ON `teachingmedia`(`schoolId`, `fiscalYear`);
