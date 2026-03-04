-- เพิ่มคอลัมน์ userId ใน pateacherdocument เพื่อผูกกับครู (ครู 1 คน บันทึก 1 ครั้งต่อปีการศึกษา ต่อโรงเรียน)
-- รันเมื่อมีตาราง pateacherdocument อยู่แล้ว (จาก Prisma หรือ PA_TEACHER_DOCUMENTS_TABLE.sql)
-- ถ้าเจอ ERROR 1060 Duplicate column name 'userId' = ตารางมี userId อยู่แล้ว ไม่ต้องรันสคริปต์นี้

-- 1. เพิ่มคอลัมน์ userId (nullable ก่อน) — ข้ามขั้นนี้ถ้ามีคอลัมน์แล้ว
ALTER TABLE `pateacherdocument` ADD COLUMN `userId` BIGINT NULL AFTER `schoolId`;

-- 2. เติม userId จาก uploadedBy สำหรับแถวที่มี uploadedBy (ถ้าไม่มีข้อมูลเก่าข้ามได้)
UPDATE `pateacherdocument` SET `userId` = `uploadedBy` WHERE `uploadedBy` IS NOT NULL AND `userId` IS NULL;

-- 3. แถวที่ยังไม่มี userId (ถ้ามี) ตั้งเป็น 0 หรือลบออก — เลือกอย่างใดอย่างหนึ่ง:
-- Option A: ตั้งเป็น 0 (ต้องมี user id 0 หรือใช้ไม่ได้)
-- UPDATE `pateacherdocument` SET `userId` = 0 WHERE `userId` IS NULL;
-- Option B: ลบแถวที่ไม่มีผู้ใช้อ้างอิง
-- DELETE FROM `pateacherdocument` WHERE `userId` IS NULL;

-- 4. ตั้ง userId เป็น NOT NULL (รันหลัง step 2/3 เมื่อไม่มีแถวที่ userId เป็น NULL แล้ว)
ALTER TABLE `pateacherdocument` MODIFY COLUMN `userId` BIGINT NOT NULL;

-- 5. ลบ unique เดิม แล้วเพิ่ม unique ใหม่ (schoolId, academicYear, documentType, userId)
ALTER TABLE `pateacherdocument` DROP INDEX `pateacherdocument_schoolId_academicYear_documentType_key`;
ALTER TABLE `pateacherdocument` ADD UNIQUE KEY `pateacherdocument_schoolId_academicYear_documentType_userId_key` (`schoolId`, `academicYear`, `documentType`, `userId`);

-- 6. เพิ่ม index สำหรับ query ตาม userId
ALTER TABLE `pateacherdocument` ADD INDEX `pateacherdocument_userId_schoolId_academicYear_idx` (`userId`, `schoolId`, `academicYear`);

-- 7. (ถ้าใช้ Prisma) เพิ่ม foreign key อ้างอิง user
-- ALTER TABLE `pateacherdocument` ADD CONSTRAINT `pateacherdocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
