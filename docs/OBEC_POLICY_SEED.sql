-- =============================================================================
-- นโยบาย สพฐ (obecpolicy) — สร้าง/อัปเดตจาก docref/policy.pdf
-- รันเมื่อ: node scripts/seed-obec-from-pdf.mjs [--fiscal-year=2568]
-- =============================================================================

-- อัปเดตจาก docref/policy.pdf (ปีงบประมาณ 2567)
INSERT INTO `obecpolicy` (`fiscalYear`, `code`, `nameTh`, `descriptionTh`, `sortNo`, `createdAt`, `updatedAt`) VALUES
(2567, 'นโยบายที่ 1', 'นโยบายและจุดเน้นข้อ 1', NULL, 1, NOW(), NOW()),
(2567, 'นโยบายที่ 2', 'นโยบายและจุดเน้นข้อ 2', NULL, 2, NOW(), NOW()),
(2567, 'นโยบายที่ 3', 'นโยบายและจุดเน้นข้อ 3', NULL, 3, NOW(), NOW()),
(2567, 'นโยบายที่ 4', 'นโยบายและจุดเน้นข้อ 4', NULL, 4, NOW(), NOW()),
(2567, 'นโยบายที่ 5', 'นโยบายและจุดเน้นข้อ 5', NULL, 5, NOW(), NOW()),
(2567, 'Quick Win', 'นโยบาย Quick Win', NULL, 10, NOW(), NOW())
ON DUPLICATE KEY UPDATE `nameTh` = VALUES(`nameTh`), `descriptionTh` = VALUES(`descriptionTh`), `updatedAt` = NOW();
