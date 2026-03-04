-- ตารางโครงการและนโยบาย สพฐ (รันเมื่อใช้ DB ที่ยังไม่มีตารางเหล่านี้)
-- โปรแกรมเสริม: บันทึกโครงการ รายงานโครงการ สรุปการดำเนินโครงการ (PDF + ลายเซ็นอิเล็กทรอนิกส์)

-- ตารางนโยบาย สพฐ รายปี
CREATE TABLE IF NOT EXISTS `obecpolicy` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `fiscalYear` INTEGER NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `nameTh` VARCHAR(191) NOT NULL,
  `descriptionTh` TEXT NULL,
  `sortNo` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `obecpolicy_fiscalYear_code_key`(`fiscalYear`, `code`),
  INDEX `obecpolicy_fiscalYear_idx`(`fiscalYear`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางโครงการ
CREATE TABLE IF NOT EXISTS `project` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `schoolId` BIGINT NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `academicYear` INTEGER NOT NULL,
  `fiscalYear` INTEGER NOT NULL,
  `responsibleUserId` BIGINT NULL,
  `obePolicyId` BIGINT NULL,
  `qaIndicatorId` BIGINT NULL,
  `paIndicatorId` BIGINT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
  `del` BOOLEAN NOT NULL DEFAULT false,
  `createdBy` BIGINT NULL,
  `updatedBy` BIGINT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `project_schoolId_code_academicYear_key`(`schoolId`, `code`, `academicYear`),
  INDEX `project_schoolId_academicYear_idx`(`schoolId`, `academicYear`),
  INDEX `project_schoolId_fiscalYear_idx`(`schoolId`, `fiscalYear`),
  INDEX `project_responsibleUserId_idx`(`responsibleUserId`),
  CONSTRAINT `project_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `project_responsibleUserId_fkey` FOREIGN KEY (`responsibleUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `project_obePolicyId_fkey` FOREIGN KEY (`obePolicyId`) REFERENCES `obecpolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `project_qaIndicatorId_fkey` FOREIGN KEY (`qaIndicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `project_paIndicatorId_fkey` FOREIGN KEY (`paIndicatorId`) REFERENCES `paindicator`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางไฟล์โครงการ (รายงานโครงการ / สรุปการดำเนินโครงการ PDF + ลายเซ็นอิเล็กทรอนิกส์)
CREATE TABLE IF NOT EXISTS `projectfile` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `projectId` BIGINT NOT NULL,
  `schoolId` BIGINT NOT NULL,
  `fileType` ENUM('PROJECT_REPORT', 'EXECUTION_SUMMARY') NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NULL,
  `fileSize` INTEGER NULL,
  `storagePath` VARCHAR(191) NULL,
  `externalUrl` VARCHAR(191) NULL,
  `signedAt` DATETIME(3) NULL,
  `signedBy` BIGINT NULL,
  `signatureMetadata` JSON NULL,
  `uploadedBy` BIGINT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `del` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  INDEX `projectfile_projectId_idx`(`projectId`),
  INDEX `projectfile_projectId_fileType_idx`(`projectId`, `fileType`),
  INDEX `projectfile_schoolId_idx`(`schoolId`),
  CONSTRAINT `projectfile_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `projectfile_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตัวอย่างข้อมูลนโยบาย สพฐ (รันเพิ่มเติมตามปีงบประมาณ)
-- INSERT INTO `obecpolicy` (`fiscalYear`,`code`,`nameTh`,`descriptionTh`,`sortNo`,`createdAt`,`updatedAt`) VALUES
-- (2567,'นโยบายที่ 1','ชื่อนโยบาย...',NULL,1,NOW(),NOW()),
-- (2567,'นโยบายที่ 2','...',NULL,2,NOW(),NOW());
