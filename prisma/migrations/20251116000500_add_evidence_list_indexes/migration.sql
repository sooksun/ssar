-- รองรับหน้ารายการหลักฐาน: WHERE schoolId IN (...) AND del = false ORDER BY createdAt DESC
-- (เดิมมีแต่ index ที่ขึ้นต้นด้วย schoolId + fiscalYear/academicYear ทำให้ต้อง filesort)
CREATE INDEX `evidence_schoolId_del_createdAt_idx` ON `evidence`(`schoolId`, `del`, `createdAt`);

-- รองรับการนับตามตัวชี้วัด/สถานะ (dashboard + รายงานความพร้อม ใช้ groupBy indicatorId,status)
CREATE INDEX `evidence_indicatorId_status_idx` ON `evidence`(`indicatorId`, `status`);
