-- ปรับ migration history ให้ตรงกับ prisma/schema.prisma
--
-- ที่มา: ตาราง/คอลัมน์กลุ่ม PA, SAR, ID plan, community teaching, area role และ
-- evidence.ai* / indicatorCodes / pdpa* ถูกเพิ่มเข้า DB ด้วย raw SQL นอก migration
-- ผลคือ `prisma migrate deploy` บนฐานข้อมูลใหม่สร้าง schema ที่ไม่ตรงกับ schema.prisma
-- (ขาด 6 ตาราง) ทำให้ container ที่ deploy ใหม่พังตอน query
--
-- >>> ฐานข้อมูลที่ "มีตารางเหล่านี้อยู่แล้ว" (dev/prod ปัจจุบัน) ห้ามรัน migration นี้ <<<
--     ให้ baseline ด้วยคำสั่งนี้แทน ครั้งเดียว ก่อน deploy รอบถัดไป:
--       npx prisma migrate resolve --applied 20251116000600_reconcile_schema_with_migrations
--     (ดู docs/MIGRATION_BASELINE.md)

-- DropForeignKey
ALTER TABLE `developmentsummary` DROP FOREIGN KEY `developmentsummary_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `paagreement` DROP FOREIGN KEY `paagreement_ibfk_1`;

-- DropForeignKey
ALTER TABLE `paagreementitem` DROP FOREIGN KEY `paagreementitem_ibfk_1`;

-- DropForeignKey
ALTER TABLE `paagreementitem` DROP FOREIGN KEY `paagreementitem_ibfk_2`;

-- DropForeignKey
ALTER TABLE `pachallengeconsideration` DROP FOREIGN KEY `pachallengeconsideration_ibfk_1`;

-- DropForeignKey
ALTER TABLE `pachallengeconsideration` DROP FOREIGN KEY `pachallengeconsideration_ibfk_2`;

-- DropForeignKey
ALTER TABLE `pachallengeitem` DROP FOREIGN KEY `pachallengeitem_ibfk_1`;

-- DropForeignKey
ALTER TABLE `paevidencemapping` DROP FOREIGN KEY `paevidencemapping_ibfk_1`;

-- DropForeignKey
ALTER TABLE `paevidencemapping` DROP FOREIGN KEY `paevidencemapping_ibfk_2`;

-- DropForeignKey
ALTER TABLE `paevidencemapping` DROP FOREIGN KEY `paevidencemapping_ibfk_3`;

-- DropForeignKey
ALTER TABLE `paindicator` DROP FOREIGN KEY `paindicator_ibfk_1`;

-- DropForeignKey
ALTER TABLE `paindicatorscale` DROP FOREIGN KEY `paindicatorscale_ibfk_1`;

-- DropForeignKey
ALTER TABLE `pasummary` DROP FOREIGN KEY `pasummary_ibfk_1`;

-- DropIndex
DROP INDEX `paagreement_userId_fiscalYear_key` ON `paagreement`;

-- DropIndex
DROP INDEX `paevidencemapping_evidenceId_agreementItemId_idx` ON `paevidencemapping`;

-- DropIndex
DROP INDEX `pasummary_schoolId_fiscalYear_isPassed_idx` ON `pasummary`;

-- AlterTable
ALTER TABLE `evidence` ADD COLUMN `aiKeywords` JSON NULL,
    ADD COLUMN `aiQualityCheck` JSON NULL,
    ADD COLUMN `aiSuggestions` TEXT NULL,
    ADD COLUMN `aiSummary` TEXT NULL,
    ADD COLUMN `evidenceType` VARCHAR(191) NULL,
    ADD COLUMN `indicatorCodes` JSON NULL,
    ADD COLUMN `pdpaChecked` BOOLEAN NULL,
    ADD COLUMN `pdpaRiskLevel` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `obecpolicy` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `paagreement` ADD COLUMN `positionType` ENUM('TEACHER', 'PRINCIPAL', 'ASSISTANT_TEACHER') NOT NULL DEFAULT 'PRINCIPAL',
    MODIFY `passReason` VARCHAR(191) NULL,
    MODIFY `note` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paagreementitem` MODIFY `comment` VARCHAR(191) NULL,
    MODIFY `evaluatorNote` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paaspect` ADD COLUMN `positionType` ENUM('TEACHER', 'PRINCIPAL', 'ASSISTANT_TEACHER') NOT NULL DEFAULT 'PRINCIPAL',
    MODIFY `code` VARCHAR(191) NOT NULL,
    MODIFY `nameTh` VARCHAR(191) NOT NULL,
    MODIFY `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pachallengeconsideration` MODIFY `comment` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pachallengeitem` MODIFY `title` VARCHAR(191) NOT NULL,
    MODIFY `description` VARCHAR(191) NULL,
    MODIFY `objectives` VARCHAR(191) NULL,
    MODIFY `c1MethodComment` VARCHAR(191) NULL,
    MODIFY `c21QuantComment` VARCHAR(191) NULL,
    MODIFY `c22QualComment` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paconsideration` MODIFY `code` VARCHAR(191) NOT NULL,
    MODIFY `nameTh` VARCHAR(191) NOT NULL,
    MODIFY `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paevidencemapping` ADD COLUMN `indicatorId` BIGINT NULL,
    MODIFY `note` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paindicator` MODIFY `code` VARCHAR(191) NOT NULL,
    MODIFY `nameTh` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `paindicatorscale` MODIFY `labelTh` VARCHAR(191) NOT NULL,
    MODIFY `descriptionTh` VARCHAR(191) NULL,
    MODIFY `criteriaTh` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pasummary` MODIFY `evaluationLevel` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `school` ADD COLUMN `areaId` BIGINT NULL;

-- CreateTable
CREATE TABLE `educationservicearea` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `nameTh` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NULL,
    `sortNo` INTEGER NOT NULL DEFAULT 0,
    `del` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `educationservicearea_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userarearole` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `areaId` BIGINT NOT NULL,
    `roleId` BIGINT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `userarearole_areaId_idx`(`areaId`),
    UNIQUE INDEX `userarearole_userId_areaId_key`(`userId`, `areaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evidenceindicatormapping` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `evidenceId` BIGINT NOT NULL,
    `indicatorId` BIGINT NOT NULL,
    `reason` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `evidenceindicatormapping_evidenceId_idx`(`evidenceId`),
    UNIQUE INDEX `evidenceindicatormapping_evidenceId_indicatorId_key`(`evidenceId`, `indicatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teachersardocument` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `academicYear` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `storageType` VARCHAR(191) NOT NULL DEFAULT 'URL',
    `storagePath` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `uploadedBy` BIGINT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `teachersardocument_schoolId_academicYear_idx`(`schoolId`, `academicYear`),
    INDEX `teachersardocument_userId_schoolId_academicYear_idx`(`userId`, `schoolId`, `academicYear`),
    UNIQUE INDEX `teachersardocument_schoolId_academicYear_userId_key`(`schoolId`, `academicYear`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacheridplan` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `academicYear` INTEGER NOT NULL,
    `idPlanCode` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `teacheridplan_schoolId_academicYear_idx`(`schoolId`, `academicYear`),
    INDEX `teacheridplan_userId_schoolId_academicYear_idx`(`userId`, `schoolId`, `academicYear`),
    UNIQUE INDEX `teacheridplan_schoolId_academicYear_userId_key`(`schoolId`, `academicYear`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communityteachingrecord` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `academicYear` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `activityDate` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `summary` TEXT NULL,
    `templateData` JSON NULL,
    `fileName` VARCHAR(191) NULL,
    `storageType` VARCHAR(191) NOT NULL DEFAULT 'URL',
    `storagePath` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `uploadedBy` BIGINT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `communityteachingrecord_schoolId_academicYear_semester_idx`(`schoolId`, `academicYear`, `semester`),
    INDEX `communityteachingrecord_userId_schoolId_academicYear_idx`(`userId`, `schoolId`, `academicYear`),
    UNIQUE INDEX `communityteachingrecord_schoolId_academicYear_semester_userI_key`(`schoolId`, `academicYear`, `semester`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `paagreement_positionType_idx` ON `paagreement`(`positionType`);

-- CreateIndex
CREATE UNIQUE INDEX `paagreement_userId_fiscalYear_positionType_key` ON `paagreement`(`userId`, `fiscalYear`, `positionType`);

-- CreateIndex
CREATE INDEX `paaspect_positionType_idx` ON `paaspect`(`positionType`);

-- CreateIndex
CREATE INDEX `paevidencemapping_indicatorId_idx` ON `paevidencemapping`(`indicatorId`);

-- CreateIndex
CREATE INDEX `school_areaId_idx` ON `school`(`areaId`);

-- AddForeignKey
ALTER TABLE `school` ADD CONSTRAINT `school_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `educationservicearea`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userarearole` ADD CONSTRAINT `userarearole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userarearole` ADD CONSTRAINT `userarearole_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `educationservicearea`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userarearole` ADD CONSTRAINT `userarearole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidenceindicatormapping` ADD CONSTRAINT `evidenceindicatormapping_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidenceindicatormapping` ADD CONSTRAINT `evidenceindicatormapping_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developmentsummary` ADD CONSTRAINT `developmentsummary_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paindicator` ADD CONSTRAINT `paindicator_aspectId_fkey` FOREIGN KEY (`aspectId`) REFERENCES `paaspect`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paindicatorscale` ADD CONSTRAINT `paindicatorscale_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `paindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paagreement` ADD CONSTRAINT `paagreement_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paagreementitem` ADD CONSTRAINT `paagreementitem_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `paagreement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paagreementitem` ADD CONSTRAINT `paagreementitem_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `paindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pachallengeitem` ADD CONSTRAINT `pachallengeitem_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `paagreement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pachallengeconsideration` ADD CONSTRAINT `pachallengeconsideration_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `pachallengeitem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pachallengeconsideration` ADD CONSTRAINT `pachallengeconsideration_considerationId_fkey` FOREIGN KEY (`considerationId`) REFERENCES `paconsideration`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paevidencemapping` ADD CONSTRAINT `paevidencemapping_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paevidencemapping` ADD CONSTRAINT `paevidencemapping_agreementItemId_fkey` FOREIGN KEY (`agreementItemId`) REFERENCES `paagreementitem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paevidencemapping` ADD CONSTRAINT `paevidencemapping_challengeConsiderationId_fkey` FOREIGN KEY (`challengeConsiderationId`) REFERENCES `pachallengeconsideration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paevidencemapping` ADD CONSTRAINT `paevidencemapping_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `paindicator`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pasummary` ADD CONSTRAINT `pasummary_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachersardocument` ADD CONSTRAINT `teachersardocument_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachersardocument` ADD CONSTRAINT `teachersardocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacheridplan` ADD CONSTRAINT `teacheridplan_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacheridplan` ADD CONSTRAINT `teacheridplan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communityteachingrecord` ADD CONSTRAINT `communityteachingrecord_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communityteachingrecord` ADD CONSTRAINT `communityteachingrecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `developmentsummary` RENAME INDEX `devsum_school_user_year_round` TO `developmentsummary_schoolId_userId_fiscalYear_assessmentRoun_key`;

