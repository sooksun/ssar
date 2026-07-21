-- AlterTable
ALTER TABLE `externalevaluation` MODIFY `strengths` VARCHAR(191) NULL,
    MODIFY `weaknesses` VARCHAR(191) NULL,
    MODIFY `recommendations` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `SelfAssessmentScope` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `levelId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SelfAssessmentScope_schoolId_fiscalYear_levelId_key`(`schoolId`, `fiscalYear`, `levelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SelfAssessmentIndicator` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scopeId` BIGINT NOT NULL,
    `standardId` BIGINT NOT NULL,
    `indicatorId` BIGINT NOT NULL,
    `targetLevel` TINYINT NULL,
    `selfScore` TINYINT NULL,
    `externalScore` TINYINT NULL,
    `evidenceSummary` VARCHAR(191) NULL,
    `strength` VARCHAR(191) NULL,
    `weakness` VARCHAR(191) NULL,
    `improvementPlan` VARCHAR(191) NULL,
    `isBestPractice` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SelfAssessmentIndicator_standardId_idx`(`standardId`),
    UNIQUE INDEX `SelfAssessmentIndicator_scopeId_indicatorId_key`(`scopeId`, `indicatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SelfAssessmentEvidenceLink` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `selfIndicatorId` BIGINT NOT NULL,
    `evidenceId` BIGINT NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndicatorScale` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `levelId` INTEGER NOT NULL,
    `indicatorId` BIGINT NOT NULL,
    `score` TINYINT NOT NULL,
    `labelTh` VARCHAR(191) NOT NULL,
    `descriptionTh` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IndicatorScale_levelId_idx`(`levelId`),
    UNIQUE INDEX `IndicatorScale_indicatorId_score_key`(`indicatorId`, `score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SelfAssessmentScope` ADD CONSTRAINT `SelfAssessmentScope_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelfAssessmentScope` ADD CONSTRAINT `SelfAssessmentScope_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `EduLevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelfAssessmentIndicator` ADD CONSTRAINT `SelfAssessmentIndicator_scopeId_fkey` FOREIGN KEY (`scopeId`) REFERENCES `SelfAssessmentScope`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelfAssessmentIndicator` ADD CONSTRAINT `SelfAssessmentIndicator_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `QAStandard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelfAssessmentIndicator` ADD CONSTRAINT `SelfAssessmentIndicator_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `QAIndicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelfAssessmentEvidenceLink` ADD CONSTRAINT `SelfAssessmentEvidenceLink_selfIndicatorId_fkey` FOREIGN KEY (`selfIndicatorId`) REFERENCES `SelfAssessmentIndicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelfAssessmentEvidenceLink` ADD CONSTRAINT `SelfAssessmentEvidenceLink_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `Evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndicatorScale` ADD CONSTRAINT `IndicatorScale_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `EduLevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndicatorScale` ADD CONSTRAINT `IndicatorScale_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `QAIndicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `school` RENAME INDEX `uq_school_sc_id` TO `School_sc_id_key`;
