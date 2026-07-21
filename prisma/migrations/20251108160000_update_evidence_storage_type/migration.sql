-- Update EvidenceFile.storageType enum and default
ALTER TABLE `EvidenceFile`
  MODIFY `storageType` ENUM('YOUTUBE','GDRIVE','URL') NOT NULL DEFAULT 'URL';

