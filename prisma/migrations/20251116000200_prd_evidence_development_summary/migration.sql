-- PRD: DevelopmentSummary table (Evidence columns already applied in previous attempt)
-- If Evidence columns are missing, run the ALTERs from a separate migration.

-- CreateTable DevelopmentSummary
CREATE TABLE `developmentsummary` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schoolId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `fiscalYear` INT NOT NULL,
    `assessmentRound` INT NOT NULL DEFAULT 1,
    `overallScore` DECIMAL(5, 2) NULL,
    `overallPassed` BOOLEAN NULL,
    `professionalScore` DECIMAL(5, 2) NULL,
    `professionalPassed` INT NULL,
    `professionalTotal` INT NULL,
    `socialScore` DECIMAL(5, 2) NULL,
    `socialPassed` INT NULL,
    `socialTotal` INT NULL,
    `personalScore` DECIMAL(5, 2) NULL,
    `personalPassed` INT NULL,
    `personalTotal` INT NULL,
    `totalEvidence` INT NOT NULL DEFAULT 0,
    `totalFiles` INT NOT NULL DEFAULT 0,
    `totalVideoLinks` INT NOT NULL DEFAULT 0,
    `totalAnalysisJobs` INT NOT NULL DEFAULT 0,
    `evidenceByIndicator` JSON NULL,
    `aiInsights` JSON NULL,
    `domainSummaries` JSON NULL,
    `indicatorNarratives` JSON NULL,
    `summaryNarrative` TEXT NULL,
    `passCriteria` JSON NULL,
    `deckPath` VARCHAR(191) NULL,
    `deckMarkdown` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `devsum_school_user_year_round`(`schoolId`, `userId`, `fiscalYear`, `assessmentRound`),
    INDEX `developmentsummary_schoolId_fiscalYear_idx`(`schoolId`, `fiscalYear`),
    CONSTRAINT `developmentsummary_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
