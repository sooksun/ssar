-- ตาราง SAR ครู และ ID plan ของครู (โปรแกรมเสริม)
-- ครู 1 คน ต่อโรงเรียน ต่อปีการศึกษา: 1 ไฟล์ SAR, 1 รายการ ID plan
-- รันเมื่อใช้ Prisma migrate หรือสร้างตารางเอง

-- 1. ส่ง SAR ครู (teachersardocument)
CREATE TABLE IF NOT EXISTS `teachersardocument` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `schoolId` BIGINT NOT NULL,
  `userId` BIGINT NOT NULL,
  `academicYear` INT NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `storageType` VARCHAR(191) NOT NULL DEFAULT 'URL',
  `storagePath` VARCHAR(191) NULL,
  `externalUrl` VARCHAR(191) NULL,
  `fileSize` INT NULL,
  `mimeType` VARCHAR(191) NULL,
  `uploadedBy` BIGINT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `teachersardocument_schoolId_academicYear_userId_key` (`schoolId`, `academicYear`, `userId`),
  KEY `teachersardocument_schoolId_academicYear_idx` (`schoolId`, `academicYear`),
  KEY `teachersardocument_userId_schoolId_academicYear_idx` (`userId`, `schoolId`, `academicYear`),
  CONSTRAINT `teachersardocument_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `teachersardocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ID plan ของครู (teacheridplan)
CREATE TABLE IF NOT EXISTS `teacheridplan` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `schoolId` BIGINT NOT NULL,
  `userId` BIGINT NOT NULL,
  `academicYear` INT NOT NULL,
  `idPlanCode` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacheridplan_schoolId_academicYear_userId_key` (`schoolId`, `academicYear`, `userId`),
  KEY `teacheridplan_schoolId_academicYear_idx` (`schoolId`, `academicYear`),
  KEY `teacheridplan_userId_schoolId_academicYear_idx` (`userId`, `schoolId`, `academicYear`),
  CONSTRAINT `teacheridplan_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `teacheridplan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
