-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_actorId_fkey`;

-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `evaluation` DROP FOREIGN KEY `Evaluation_indicatorId_fkey`;

-- DropForeignKey
ALTER TABLE `evaluation` DROP FOREIGN KEY `Evaluation_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `evaluation` DROP FOREIGN KEY `Evaluation_standardId_fkey`;

-- DropForeignKey
ALTER TABLE `evidence` DROP FOREIGN KEY `Evidence_indicatorId_fkey`;

-- DropForeignKey
ALTER TABLE `evidence` DROP FOREIGN KEY `Evidence_ownerUserId_fkey`;

-- DropForeignKey
ALTER TABLE `evidence` DROP FOREIGN KEY `Evidence_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `evidencefile` DROP FOREIGN KEY `EvidenceFile_evidenceId_fkey`;

-- DropForeignKey
ALTER TABLE `evidencefile` DROP FOREIGN KEY `EvidenceFile_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `evidencefile` DROP FOREIGN KEY `EvidenceFile_uploadedBy_fkey`;

-- DropForeignKey
ALTER TABLE `evidencereview` DROP FOREIGN KEY `EvidenceReview_evidenceFileId_fkey`;

-- DropForeignKey
ALTER TABLE `evidencereview` DROP FOREIGN KEY `EvidenceReview_evidenceId_fkey`;

-- DropForeignKey
ALTER TABLE `evidencereview` DROP FOREIGN KEY `EvidenceReview_reviewerId_fkey`;

-- DropForeignKey
ALTER TABLE `evidencereview` DROP FOREIGN KEY `EvidenceReview_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `externalassessment` DROP FOREIGN KEY `ExternalAssessment_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `externalevaluation` DROP FOREIGN KEY `ExternalEvaluation_evidenceId_fkey`;

-- DropForeignKey
ALTER TABLE `externalevaluation` DROP FOREIGN KEY `ExternalEvaluation_externalAssessmentId_fkey`;

-- DropForeignKey
ALTER TABLE `externalevaluation` DROP FOREIGN KEY `ExternalEvaluation_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `indicatorscale` DROP FOREIGN KEY `IndicatorScale_indicatorId_fkey`;

-- DropForeignKey
ALTER TABLE `indicatorscale` DROP FOREIGN KEY `IndicatorScale_levelId_fkey`;

-- DropForeignKey
ALTER TABLE `qaindicator` DROP FOREIGN KEY `QAIndicator_standardId_fkey`;

-- DropForeignKey
ALTER TABLE `qastandard` DROP FOREIGN KEY `QAStandard_levelId_fkey`;

-- DropForeignKey
ALTER TABLE `qasubindicator` DROP FOREIGN KEY `QASubIndicator_indicatorId_fkey`;

-- DropForeignKey
ALTER TABLE `sarreport` DROP FOREIGN KEY `SarReport_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentevidencelink` DROP FOREIGN KEY `SelfAssessmentEvidenceLink_evidenceId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentevidencelink` DROP FOREIGN KEY `SelfAssessmentEvidenceLink_selfIndicatorId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentindicator` DROP FOREIGN KEY `SelfAssessmentIndicator_indicatorId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentindicator` DROP FOREIGN KEY `SelfAssessmentIndicator_scopeId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentindicator` DROP FOREIGN KEY `SelfAssessmentIndicator_standardId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentscope` DROP FOREIGN KEY `SelfAssessmentScope_levelId_fkey`;

-- DropForeignKey
ALTER TABLE `selfassessmentscope` DROP FOREIGN KEY `SelfAssessmentScope_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `userschoolrole` DROP FOREIGN KEY `UserSchoolRole_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `userschoolrole` DROP FOREIGN KEY `UserSchoolRole_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `userschoolrole` DROP FOREIGN KEY `UserSchoolRole_userId_fkey`;

-- AlterTable
ALTER TABLE `evidencefile` MODIFY `storageType` ENUM('YOUTUBE', 'GDRIVE', 'URL', 'CANVA', 'LINK') NOT NULL DEFAULT 'URL';

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userschoolrole` ADD CONSTRAINT `userschoolrole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userschoolrole` ADD CONSTRAINT `userschoolrole_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userschoolrole` ADD CONSTRAINT `userschoolrole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qastandard` ADD CONSTRAINT `qastandard_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `edulevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qaindicator` ADD CONSTRAINT `qaindicator_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `qastandard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qasubindicator` ADD CONSTRAINT `qasubindicator_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencefile` ADD CONSTRAINT `evidencefile_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencefile` ADD CONSTRAINT `evidencefile_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencefile` ADD CONSTRAINT `evidencefile_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencereview` ADD CONSTRAINT `evidencereview_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencereview` ADD CONSTRAINT `evidencereview_evidenceFileId_fkey` FOREIGN KEY (`evidenceFileId`) REFERENCES `evidencefile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencereview` ADD CONSTRAINT `evidencereview_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evidencereview` ADD CONSTRAINT `evidencereview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluation` ADD CONSTRAINT `evaluation_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluation` ADD CONSTRAINT `evaluation_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `qastandard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluation` ADD CONSTRAINT `evaluation_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sarreport` ADD CONSTRAINT `sarreport_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `externalassessment` ADD CONSTRAINT `externalassessment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `externalevaluation` ADD CONSTRAINT `externalevaluation_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `externalevaluation` ADD CONSTRAINT `externalevaluation_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `externalevaluation` ADD CONSTRAINT `externalevaluation_externalAssessmentId_fkey` FOREIGN KEY (`externalAssessmentId`) REFERENCES `externalassessment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `auditlog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `auditlog_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentscope` ADD CONSTRAINT `selfassessmentscope_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentscope` ADD CONSTRAINT `selfassessmentscope_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `edulevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentindicator` ADD CONSTRAINT `selfassessmentindicator_scopeId_fkey` FOREIGN KEY (`scopeId`) REFERENCES `selfassessmentscope`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentindicator` ADD CONSTRAINT `selfassessmentindicator_standardId_fkey` FOREIGN KEY (`standardId`) REFERENCES `qastandard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentindicator` ADD CONSTRAINT `selfassessmentindicator_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentevidencelink` ADD CONSTRAINT `selfassessmentevidencelink_selfIndicatorId_fkey` FOREIGN KEY (`selfIndicatorId`) REFERENCES `selfassessmentindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selfassessmentevidencelink` ADD CONSTRAINT `selfassessmentevidencelink_evidenceId_fkey` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicatorscale` ADD CONSTRAINT `indicatorscale_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `edulevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicatorscale` ADD CONSTRAINT `indicatorscale_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `qaindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `edulevel` RENAME INDEX `EduLevel_code_key` TO `edulevel_code_key`;

-- RenameIndex
ALTER TABLE `evaluation` RENAME INDEX `Evaluation_schoolId_fiscalYear_idx` TO `evaluation_schoolId_fiscalYear_idx`;

-- RenameIndex
ALTER TABLE `evidence` RENAME INDEX `Evidence_schoolId_fiscalYear_indicatorId_status_idx` TO `evidence_schoolId_fiscalYear_indicatorId_status_idx`;

-- RenameIndex
ALTER TABLE `evidencefile` RENAME INDEX `EvidenceFile_evidenceId_idx` TO `evidencefile_evidenceId_idx`;

-- RenameIndex
ALTER TABLE `evidencefile` RENAME INDEX `EvidenceFile_evidenceId_isPrimary_idx` TO `evidencefile_evidenceId_isPrimary_idx`;

-- RenameIndex
ALTER TABLE `evidencefile` RENAME INDEX `EvidenceFile_schoolId_idx` TO `evidencefile_schoolId_idx`;

-- RenameIndex
ALTER TABLE `evidencereview` RENAME INDEX `EvidenceReview_evidenceFileId_idx` TO `evidencereview_evidenceFileId_idx`;

-- RenameIndex
ALTER TABLE `externalevaluation` RENAME INDEX `ExternalEvaluation_evidenceId_evaluatorName_key` TO `externalevaluation_evidenceId_evaluatorName_key`;

-- RenameIndex
ALTER TABLE `externalevaluation` RENAME INDEX `ExternalEvaluation_evidenceId_idx` TO `externalevaluation_evidenceId_idx`;

-- RenameIndex
ALTER TABLE `externalevaluation` RENAME INDEX `ExternalEvaluation_externalAssessmentId_idx` TO `externalevaluation_externalAssessmentId_idx`;

-- RenameIndex
ALTER TABLE `externalevaluation` RENAME INDEX `ExternalEvaluation_schoolId_idx` TO `externalevaluation_schoolId_idx`;

-- RenameIndex
ALTER TABLE `indicatorscale` RENAME INDEX `IndicatorScale_indicatorId_score_key` TO `indicatorscale_indicatorId_score_key`;

-- RenameIndex
ALTER TABLE `indicatorscale` RENAME INDEX `IndicatorScale_levelId_idx` TO `indicatorscale_levelId_idx`;

-- RenameIndex
ALTER TABLE `qaindicator` RENAME INDEX `QAIndicator_standardId_code_key` TO `qaindicator_standardId_code_key`;

-- RenameIndex
ALTER TABLE `qastandard` RENAME INDEX `QAStandard_levelId_code_key` TO `qastandard_levelId_code_key`;

-- RenameIndex
ALTER TABLE `qasubindicator` RENAME INDEX `QASubIndicator_indicatorId_itemNo_key` TO `qasubindicator_indicatorId_itemNo_key`;

-- RenameIndex
ALTER TABLE `role` RENAME INDEX `Role_code_key` TO `role_code_key`;

-- RenameIndex
ALTER TABLE `school` RENAME INDEX `School_sc_id_key` TO `school_sc_id_key`;

-- RenameIndex
ALTER TABLE `selfassessmentindicator` RENAME INDEX `SelfAssessmentIndicator_scopeId_indicatorId_key` TO `selfassessmentindicator_scopeId_indicatorId_key`;

-- RenameIndex
ALTER TABLE `selfassessmentindicator` RENAME INDEX `SelfAssessmentIndicator_standardId_idx` TO `selfassessmentindicator_standardId_idx`;

-- RenameIndex
ALTER TABLE `selfassessmentscope` RENAME INDEX `SelfAssessmentScope_schoolId_fiscalYear_levelId_key` TO `selfassessmentscope_schoolId_fiscalYear_levelId_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_email_key` TO `user_email_key`;

-- RenameIndex
ALTER TABLE `userschoolrole` RENAME INDEX `UserSchoolRole_userId_schoolId_idx` TO `userschoolrole_userId_schoolId_idx`;
