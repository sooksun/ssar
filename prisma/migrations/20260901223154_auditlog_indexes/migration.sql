-- CreateIndex
CREATE INDEX `auditlog_createdAt_idx` ON `auditlog`(`createdAt`);

-- CreateIndex
CREATE INDEX `auditlog_schoolId_createdAt_idx` ON `auditlog`(`schoolId`, `createdAt`);

-- CreateIndex
CREATE INDEX `auditlog_action_createdAt_idx` ON `auditlog`(`action`, `createdAt`);

-- CreateIndex
CREATE INDEX `auditlog_actorId_createdAt_idx` ON `auditlog`(`actorId`, `createdAt`);
