-- CreateTable
CREATE TABLE `teachingmedia` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `indicatorId` BIGINT NOT NULL,
    `academicYear` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `teacherName` VARCHAR(191) NOT NULL,
    `teacherId` BIGINT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `del` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` BIGINT NULL,
    `updatedBy` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `teachingmedia_schoolId_academicYear_indicatorId_idx`(`schoolId`, `academicYear`, `indicatorId`),
    INDEX `teachingmedia_schoolId_academicYear_idx`(`schoolId`, `academicYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teachingmediafile` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `teachingMediaId` BIGINT NOT NULL,
    `schoolId` BIGINT NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `storageType` ENUM('YOUTUBE', 'GDRIVE', 'URL', 'CANVA', 'LINK') NOT NULL DEFAULT 'URL',
    `storagePath` VARCHAR(191) NULL,
    `driveFileId` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `fileUrls` JSON NULL,
    `description` VARCHAR(191) NULL,
    `uploadedBy` BIGINT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `del` BOOLEAN NOT NULL DEFAULT false,

    INDEX `teachingmediafile_teachingMediaId_idx`(`teachingMediaId`),
    INDEX `teachingmediafile_teachingMediaId_isPrimary_idx`(`teachingMediaId`, `isPrimary`),
    INDEX `teachingmediafile_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessonplan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `academicYear` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `teacherName` VARCHAR(191) NOT NULL,
    `teacherId` BIGINT NULL,
    `subject` VARCHAR(191) NULL,
    `grade` VARCHAR(191) NULL,
    `planDate` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `reflection` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `del` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` BIGINT NULL,
    `updatedBy` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `lessonplan_schoolId_academicYear_idx`(`schoolId`, `academicYear`),
    INDEX `lessonplan_schoolId_academicYear_status_idx`(`schoolId`, `academicYear`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessonplanfile` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lessonPlanId` BIGINT NOT NULL,
    `schoolId` BIGINT NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `storageType` ENUM('YOUTUBE', 'GDRIVE', 'URL', 'CANVA', 'LINK') NOT NULL DEFAULT 'URL',
    `storagePath` VARCHAR(191) NULL,
    `driveFileId` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `fileType` ENUM('PLAN', 'REFLECTION', 'OTHER') NOT NULL DEFAULT 'PLAN',
    `description` VARCHAR(191) NULL,
    `uploadedBy` BIGINT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `del` BOOLEAN NOT NULL DEFAULT false,

    INDEX `lessonplanfile_lessonPlanId_idx`(`lessonPlanId`),
    INDEX `lessonplanfile_lessonPlanId_isPrimary_idx`(`lessonPlanId`, `isPrimary`),
    INDEX `lessonplanfile_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `teachingmedia` ADD CONSTRAINT `teachingmedia_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachingmedia` ADD CONSTRAINT `teachingmedia_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachingmediafile` ADD CONSTRAINT `teachingmediafile_teachingMediaId_fkey` FOREIGN KEY (`teachingMediaId`) REFERENCES `teachingmedia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachingmediafile` ADD CONSTRAINT `teachingmediafile_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessonplan` ADD CONSTRAINT `lessonplan_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessonplanfile` ADD CONSTRAINT `lessonplanfile_lessonPlanId_fkey` FOREIGN KEY (`lessonPlanId`) REFERENCES `lessonplan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessonplanfile` ADD CONSTRAINT `lessonplanfile_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
