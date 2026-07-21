-- CreateExternalEvaluation
CREATE TABLE `ExternalEvaluation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `evidenceId` BIGINT NOT NULL,
    `schoolId` BIGINT NOT NULL,
    `externalAssessmentId` BIGINT NULL,
    `evaluatorName` VARCHAR(191) NOT NULL,
    `evaluatorOrg` VARCHAR(191) NULL,
    `evaluationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `score` DECIMAL(5, 2) NULL,
    `strengths` TEXT NULL,
    `weaknesses` TEXT NULL,
    `recommendations` TEXT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `createdBy` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExternalEvaluation_evidenceId_idx`(`evidenceId`),
    INDEX `ExternalEvaluation_schoolId_idx`(`schoolId`),
    INDEX `ExternalEvaluation_externalAssessmentId_idx`(`externalAssessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExternalEvaluation` ADD CONSTRAINT `ExternalEvaluation_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `Evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalEvaluation` ADD CONSTRAINT `ExternalEvaluation_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalEvaluation` ADD CONSTRAINT `ExternalEvaluation_externalAssessmentId_fkey` FOREIGN KEY (`externalAssessmentId`) REFERENCES `ExternalAssessment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

