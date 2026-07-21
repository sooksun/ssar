-- CreateTable
CREATE TABLE `School` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sc_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `area_name` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `level_type` VARCHAR(191) NULL,
    `del` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `del` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSchoolRole` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `schoolId` BIGINT NOT NULL,
    `roleId` BIGINT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserSchoolRole_userId_schoolId_idx`(`userId`, `schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EduLevel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `nameTh` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `EduLevel_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QAStandard` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `levelId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `nameTh` VARCHAR(191) NOT NULL,
    `sortNo` INTEGER NOT NULL,

    UNIQUE INDEX `QAStandard_levelId_code_key`(`levelId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QAIndicator` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `standardId` BIGINT NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `nameTh` VARCHAR(191) NOT NULL,
    `descriptionTh` VARCHAR(191) NULL,
    `sortNo` INTEGER NOT NULL,

    UNIQUE INDEX `QAIndicator_standardId_code_key`(`standardId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QASubIndicator` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `indicatorId` BIGINT NOT NULL,
    `itemNo` INTEGER NOT NULL,
    `textTh` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `QASubIndicator_indicatorId_itemNo_key`(`indicatorId`, `itemNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evidence` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `indicatorId` BIGINT NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('MISSING', 'PENDING', 'READY', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `evidenceCode` VARCHAR(191) NULL,
    `ownerUserId` BIGINT NULL,
    `privacyLevel` ENUM('PUBLIC', 'INTERNAL', 'CONFIDENTIAL') NOT NULL DEFAULT 'INTERNAL',
    `del` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` BIGINT NULL,
    `updatedBy` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Evidence_schoolId_fiscalYear_indicatorId_status_idx`(`schoolId`, `fiscalYear`, `indicatorId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvidenceFile` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `evidenceId` BIGINT NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `storageType` ENUM('LOCAL', 'GDRIVE', 'URL') NOT NULL,
    `storagePath` VARCHAR(191) NULL,
    `driveFileId` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `checksumSha1` VARCHAR(191) NULL,
    `versionNo` INTEGER NOT NULL DEFAULT 1,
    `uploadedBy` BIGINT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(191) NULL,
    `del` BOOLEAN NOT NULL DEFAULT false,

    INDEX `EvidenceFile_evidenceId_idx`(`evidenceId`),
    INDEX `EvidenceFile_evidenceId_isPrimary_idx`(`evidenceId`, `isPrimary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvidenceReview` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `evidenceId` BIGINT NOT NULL,
    `reviewerId` BIGINT NOT NULL,
    `reviewStatus` ENUM('NEED_MORE', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'NEED_MORE',
    `score` DECIMAL(5, 2) NULL,
    `comment` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evaluation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `standardId` BIGINT NOT NULL,
    `indicatorId` BIGINT NULL,
    `evalType` ENUM('SELF', 'EXTERNAL') NOT NULL DEFAULT 'SELF',
    `score` DECIMAL(5, 2) NULL,
    `comment` VARCHAR(191) NULL,
    `createdBy` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Evaluation_schoolId_fiscalYear_idx`(`schoolId`, `fiscalYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SarReport` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `storageType` ENUM('LOCAL', 'GDRIVE', 'URL') NOT NULL,
    `storagePath` VARCHAR(191) NULL,
    `driveFileId` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `versionNo` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'READY', 'SUBMITTED', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `createdBy` BIGINT NULL,
    `updatedBy` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalAssessment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `visitDate` DATETIME(3) NOT NULL,
    `assessorsNote` VARCHAR(191) NULL,
    `agendaUrl` VARCHAR(191) NULL,
    `reportUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorId` BIGINT NULL,
    `schoolId` BIGINT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetTable` VARCHAR(191) NOT NULL,
    `targetId` BIGINT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserSchoolRole` ADD CONSTRAINT `UserSchoolRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSchoolRole` ADD CONSTRAINT `UserSchoolRole_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSchoolRole` ADD CONSTRAINT `UserSchoolRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QAStandard` ADD CONSTRAINT `QAStandard_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `EduLevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QAIndicator` ADD CONSTRAINT `QAIndicator_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `QAStandard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QASubIndicator` ADD CONSTRAINT `QASubIndicator_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `QAIndicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evidence` ADD CONSTRAINT `Evidence_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evidence` ADD CONSTRAINT `Evidence_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `QAIndicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evidence` ADD CONSTRAINT `Evidence_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvidenceFile` ADD CONSTRAINT `EvidenceFile_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `Evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvidenceFile` ADD CONSTRAINT `EvidenceFile_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvidenceReview` ADD CONSTRAINT `EvidenceReview_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `Evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvidenceReview` ADD CONSTRAINT `EvidenceReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `QAStandard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `QAIndicator`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SarReport` ADD CONSTRAINT `SarReport_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalAssessment` ADD CONSTRAINT `ExternalAssessment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
