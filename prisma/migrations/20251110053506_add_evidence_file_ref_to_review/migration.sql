-- AlterTable
ALTER TABLE `evidencereview` ADD COLUMN `evidenceFileId` BIGINT NULL;

-- CreateIndex
CREATE INDEX `EvidenceReview_evidenceFileId_idx` ON `EvidenceReview`(`evidenceFileId`);

-- AddForeignKey
ALTER TABLE `EvidenceReview` ADD CONSTRAINT `EvidenceReview_evidenceFileId_fkey` FOREIGN KEY (`evidenceFileId`) REFERENCES `EvidenceFile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
