-- AlterTable
ALTER TABLE `lessonplanfile` ADD COLUMN `fileUrls` JSON NULL,
    ADD COLUMN `thumbnailUrl` VARCHAR(191) NULL;
