-- Migration: use_school_sc_id
-- เป้าหมาย: ปรับทุกตารางให้อ้างอิงโรงเรียนด้วย school.sc_id แทน school.id

/* 1) เตรียมตาราง school */
ALTER TABLE `school`
  MODIFY `sc_id` BIGINT NOT NULL;

SET @index_exist := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'school'
    AND INDEX_NAME = 'uq_school_sc_id'
);

SET @sql := IF(
  @index_exist = 0,
  'ALTER TABLE `school` ADD UNIQUE INDEX `uq_school_sc_id` (`sc_id`);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* 2) evidence: ปรับค่า schoolId ให้เท่ากับ sc_id และชี้ FK ใหม่ */
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'evidence'
    AND REFERENCED_TABLE_NAME = 'school'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `evidence` DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `evidence` e
JOIN `school` s ON s.`id` = e.`schoolId`
SET e.`schoolId` = s.`sc_id`;

ALTER TABLE `evidence`
  ADD CONSTRAINT `Evidence_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* 3) evaluation */
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'evaluation'
    AND REFERENCED_TABLE_NAME = 'school'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `evaluation` DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `evaluation` ev
JOIN `school` s ON s.`id` = ev.`schoolId`
SET ev.`schoolId` = s.`sc_id`;

ALTER TABLE `evaluation`
  ADD CONSTRAINT `Evaluation_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* 4) externalassessment */
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'externalassessment'
    AND REFERENCED_TABLE_NAME = 'school'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `externalassessment` DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `externalassessment` ea
JOIN `school` s ON s.`id` = ea.`schoolId`
SET ea.`schoolId` = s.`sc_id`;

ALTER TABLE `externalassessment`
  ADD CONSTRAINT `ExternalAssessment_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* 5) sarreport */
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sarreport'
    AND REFERENCED_TABLE_NAME = 'school'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `sarreport` DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `sarreport` sr
JOIN `school` s ON s.`id` = sr.`schoolId`
SET sr.`schoolId` = s.`sc_id`;

ALTER TABLE `sarreport`
  ADD CONSTRAINT `SarReport_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* 6) auditlog: ค่าอาจเป็น NULL */
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'auditlog'
    AND REFERENCED_TABLE_NAME = 'school'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `auditlog` DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `auditlog` al
JOIN `school` s ON s.`id` = al.`schoolId`
SET al.`schoolId` = s.`sc_id`
WHERE al.`schoolId` IS NOT NULL;

ALTER TABLE `auditlog`
  ADD CONSTRAINT `AuditLog_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

/* 7) userschoolrole */
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'userschoolrole'
    AND REFERENCED_TABLE_NAME = 'school'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `userschoolrole` DROP FOREIGN KEY `', @fk_name, '`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `userschoolrole` usr
JOIN `school` s ON s.`id` = usr.`schoolId`
SET usr.`schoolId` = s.`sc_id`;

ALTER TABLE `userschoolrole`
  ADD CONSTRAINT `UserSchoolRole_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* 8) user: เพิ่มคอลัมน์ schoolId (nullable) แล้วตั้งค่า */
ALTER TABLE `user`
  ADD COLUMN `schoolId` BIGINT NULL AFTER `password`;

UPDATE `user` u
LEFT JOIN (
  SELECT usr.`userId`, MIN(usr.`schoolId`) AS `schoolId`
  FROM `userschoolrole` usr
  WHERE usr.`isActive` = 1
  GROUP BY usr.`userId`
) activeRole ON activeRole.`userId` = u.`id`
SET u.`schoolId` = activeRole.`schoolId`
WHERE activeRole.`schoolId` IS NOT NULL;

ALTER TABLE `user`
  ADD CONSTRAINT `User_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

/* 9) evidencefile: เพิ่มคอลัมน์ใหม่ เติมข้อมูล และสร้าง FK */
ALTER TABLE `evidencefile`
  ADD COLUMN `schoolId` BIGINT NULL AFTER `evidenceId`;

UPDATE `evidencefile` ef
JOIN `evidence` e ON e.`id` = ef.`evidenceId`
SET ef.`schoolId` = e.`schoolId`;

ALTER TABLE `evidencefile`
  MODIFY `schoolId` BIGINT NOT NULL,
  ADD INDEX `EvidenceFile_schoolId_idx` (`schoolId`);

ALTER TABLE `evidencefile`
  ADD CONSTRAINT `EvidenceFile_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* 10) evidencereview: เพิ่มคอลัมน์ใหม่ เติมข้อมูล และสร้าง FK */
ALTER TABLE `evidencereview`
  ADD COLUMN `schoolId` BIGINT NULL AFTER `evidenceId`;

UPDATE `evidencereview` er
JOIN `evidence` e ON e.`id` = er.`evidenceId`
SET er.`schoolId` = e.`schoolId`;

ALTER TABLE `evidencereview`
  MODIFY `schoolId` BIGINT NOT NULL,
  ADD INDEX `EvidenceReview_schoolId_idx` (`schoolId`);

ALTER TABLE `evidencereview`
  ADD CONSTRAINT `EvidenceReview_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

/* หมายเหตุ: หากในฐานข้อมูลมีตาราง self assessment หรืออื่น ๆ ให้ปรับตามแนวทางเดียวกัน */


