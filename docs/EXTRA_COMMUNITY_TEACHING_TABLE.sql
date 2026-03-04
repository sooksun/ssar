-- ตาราง บันทึกการสอนชุมชน (โปรแกรมเสริม)
-- ภาคเรียนละไม่เกิน 1 ฉบับต่อ 1 คน — อ้างอิง template docref/pp5.pdf
-- รันเมื่อใช้ Prisma migrate หรือสร้างตารางเอง

CREATE TABLE IF NOT EXISTS `communityteachingrecord` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `schoolId` BIGINT NOT NULL,
  `userId` BIGINT NOT NULL,
  `academicYear` INT NOT NULL,
  `semester` INT NOT NULL,
  `title` VARCHAR(191) NULL,
  `activityDate` DATETIME(3) NULL,
  `location` VARCHAR(191) NULL,
  `summary` TEXT NULL,
  `templateData` JSON NULL,
  `fileName` VARCHAR(191) NULL,
  `storageType` VARCHAR(191) NOT NULL DEFAULT 'URL',
  `storagePath` VARCHAR(191) NULL,
  `externalUrl` VARCHAR(191) NULL,
  `fileSize` INT NULL,
  `mimeType` VARCHAR(191) NULL,
  `uploadedBy` BIGINT NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `communityteachingrecord_schoolId_academicYear_semester_userId_key` (`schoolId`, `academicYear`, `semester`, `userId`),
  KEY `communityteachingrecord_schoolId_academicYear_semester_idx` (`schoolId`, `academicYear`, `semester`),
  KEY `communityteachingrecord_userId_schoolId_academicYear_idx` (`userId`, `schoolId`, `academicYear`),
  CONSTRAINT `communityteachingrecord_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `communityteachingrecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
