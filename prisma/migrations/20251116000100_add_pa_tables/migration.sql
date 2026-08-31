-- =============================================================================
-- Migration: Add PA (Performance Agreement) Tables
-- สำหรับการประเมินผลการพัฒนางานตามข้อตกลง
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. สร้างตาราง PAAspect (5 ด้าน)
-- -----------------------------------------------------------------------------
CREATE TABLE `paaspect` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(10) NOT NULL,
  `nameTh` VARCHAR(255) NOT NULL,
  `sortNo` INT NOT NULL,
  `description` TEXT NULL,
  `maxScore` INT NOT NULL DEFAULT 60,
  `part` ENUM('PART1', 'PART2') NOT NULL DEFAULT 'PART1',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `paaspect_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลเริ่มต้น: 5 ด้านของ PA
INSERT INTO `paaspect` (`code`, `nameTh`, `sortNo`, `maxScore`, `part`, `updatedAt`) VALUES
('P1', 'ด้านการบริหารวิชาการและความเป็นผู้นำทางวิชาการ', 1, 60, 'PART1', NOW()),
('P2', 'ด้านการบริหารจัดการสถานศึกษา', 2, 60, 'PART1', NOW()),
('P3', 'ด้านการบริหารการเปลี่ยนแปลงเชิงกลยุทธ์และนวัตกรรม', 3, 60, 'PART1', NOW()),
('P4', 'ด้านการบริหารงานชุมชนและเครือข่าย', 4, 60, 'PART1', NOW()),
('P5', 'ด้านการพัฒนาตนเองและวิชาชีพ', 5, 60, 'PART1', NOW());

-- -----------------------------------------------------------------------------
-- 2. สร้างตาราง PAIndicator (15 ตัวชี้วัด)
-- -----------------------------------------------------------------------------
CREATE TABLE `paindicator` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `aspectId` BIGINT NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `nameTh` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `sortNo` INT NOT NULL,
  `weight` DECIMAL(5,2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `paindicator_aspectId_code_key` (`aspectId`, `code`),
  INDEX `paindicator_aspectId_idx` (`aspectId`),
  
  FOREIGN KEY (`aspectId`) REFERENCES `paaspect`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลเริ่มต้น: 15 ตัวชี้วัด
-- ด้าน 1: การบริหารวิชาการ (6 ตัวชี้วัด)
INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '1.1', 'การวางแผนพัฒนามาตรฐานการเรียนรู้ของผู้เรียน', 
'มีการริเริ่ม พัฒนา มาตรฐานการเรียนรู้ของผู้เรียน โดยมีแผนพัฒนาที่สอดคล้องกับนโยบายทุกระดับ ครอบคลุมภารกิจหลักของสถานศึกษา', 
1, NOW() FROM `paaspect` WHERE code = 'P1';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '1.2', 'การจัดทำและพัฒนาหลักสูตรสถานศึกษา',
'หลักสูตรสถานศึกษามีความทันสมัย สอดคล้องกับความต้องการของผู้เรียนและท้องถิ่น โดยมีผู้บริหาร ครู ผู้ปกครอง และชุมชนมีส่วนร่วม',
2, NOW() FROM `paaspect` WHERE code = 'P1';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '1.3', 'การพัฒนากระบวนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญและปฏิบัติการสอน',
'มีการริเริ่ม พัฒนา กระบวนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญ ครูมีการเตรียมการจัดการเรียนรู้ มีการวิเคราะห์ผู้เรียน',
3, NOW() FROM `paaspect` WHERE code = 'P1';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '1.4', 'การส่งเสริม สนับสนุน การพัฒนาหรือการนำสื่อ นวัตกรรม และเทคโนโลยีทางการศึกษามาใช้ในการจัดการเรียนรู้',
'ริเริ่ม พัฒนา ส่งเสริม สนับสนุนการนำสื่อ นวัตกรรม และเทคโนโลยีทางการศึกษามาใช้ในการจัดการเรียนรู้ตรงตามที่หลักสูตรกำหนด',
4, NOW() FROM `paaspect` WHERE code = 'P1';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '1.5', 'การนิเทศ กำกับ ติดตาม ประเมินผลการจัดการเรียนรู้ของครูในสถานศึกษา และมีการประกันคุณภาพการศึกษาภายในสถานศึกษา',
'นิเทศ กำกับ ติดตาม และประเมินผลการจัดการเรียนรู้ของครู โดยมีการริเริ่ม พัฒนา ส่งเสริมกระบวนการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ',
5, NOW() FROM `paaspect` WHERE code = 'P1';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '1.6', 'การศึกษา วิเคราะห์ เพื่อแก้ปัญหาและพัฒนาการจัดการเรียนรู้ เพื่อยกระดับคุณภาพการศึกษาของสถานศึกษา',
'การศึกษา วิเคราะห์ เพื่อแก้ปัญหาและพัฒนาการจัดการเรียนรู้ เพื่อยกระดับคุณภาพการศึกษาของสถานศึกษา',
6, NOW() FROM `paaspect` WHERE code = 'P1';

-- ด้าน 2: การบริหารจัดการสถานศึกษา (3 ตัวชี้วัด)
INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '2.1', 'การบริหารจัดการสถานศึกษาให้เป็นไปตามกฎหมาย ระเบียบ ข้อบังคับ นโยบาย และตามหลักบริหารกิจการบ้านเมืองที่ดี',
'การบริหารจัดการสถานศึกษา ด้านงานวิชาการ ด้านการบริหารงานบุคคล ด้านงบประมาณ ด้านบริหารทั่วไป ตามกฎหมาย ระเบียบ',
1, NOW() FROM `paaspect` WHERE code = 'P2';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '2.2', 'การบริหารกิจการผู้เรียนและการส่งเสริมพัฒนาผู้เรียน',
'ริเริ่ม พัฒนาการบริหารกิจการผู้เรียนและการส่งเสริมพัฒนาผู้เรียน มีสารสนเทศและแผนปฏิบัติการ',
2, NOW() FROM `paaspect` WHERE code = 'P2';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '2.3', 'การจัดระบบดูแลช่วยเหลือผู้เรียน',
'ริเริ่ม พัฒนาการจัดระบบดูแลช่วยเหลือผู้เรียนให้มีโอกาส ความเสมอภาค และลดความเหลื่อมล้ำทางการศึกษา',
3, NOW() FROM `paaspect` WHERE code = 'P2';

-- ด้าน 3: การบริหารการเปลี่ยนแปลงเชิงกลยุทธ์และนวัตกรรม (2 ตัวชี้วัด)
INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '3.1', 'การกำหนดนโยบาย กลยุทธ์ การใช้เครื่องมือหรือนวัตกรรมทางการบริหาร',
'การบริหารจัดการสถานศึกษา โดยมีกลยุทธ์ เครื่องมือ หรือนวัตกรรมทางการบริหารเชิงรุกในการริเริ่ม พัฒนา',
1, NOW() FROM `paaspect` WHERE code = 'P3';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '3.2', 'การบริหารการเปลี่ยนแปลงและนวัตกรรมในสถานศึกษาเพื่อพัฒนาสถานศึกษา',
'บริหารการเปลี่ยนแปลงและนวัตกรรมในสถานศึกษาเพื่อพัฒนาสถานศึกษา โดยริเริ่ม พัฒนา สร้างหรือนำนวัตกรรม',
2, NOW() FROM `paaspect` WHERE code = 'P3';

-- ด้าน 4: การบริหารงานชุมชนและเครือข่าย (2 ตัวชี้วัด)
INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '4.1', 'การสร้างและพัฒนาเครือข่ายเพื่อพัฒนาการเรียนรู้',
'ริเริ่ม พัฒนาสร้างความร่วมมืออย่างสร้างสรรค์กับผู้เรียน ครู คณะกรรมการสถานศึกษา ผู้ปกครอง ผู้ที่เกี่ยวข้อง',
1, NOW() FROM `paaspect` WHERE code = 'P4';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '4.2', 'การจัดระบบการให้บริการในสถานศึกษา',
'การจัดระบบการให้บริการในสถานศึกษา โดยริเริ่ม พัฒนา ประสานความร่วมมือกับชุมชนและเครือข่าย',
2, NOW() FROM `paaspect` WHERE code = 'P4';

-- ด้าน 5: การพัฒนาตนเองและวิชาชีพ (2 ตัวชี้วัด)
INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '5.1', 'การพัฒนาตนเองและวิชาชีพ',
'มีการพัฒนาตนเองและวิชาชีพอย่างเป็นระบบและต่อเนื่องเพื่อให้มีความรู้ ความสามารถ ทักษะ',
1, NOW() FROM `paaspect` WHERE code = 'P5';

INSERT INTO `paindicator` (`aspectId`, `code`, `nameTh`, `description`, `sortNo`, `updatedAt`) 
SELECT id, '5.2', 'การนำความรู้ ทักษะ ที่ได้จากการพัฒนาตนเองและวิชาชีพมาใช้ในการพัฒนาการบริหารจัดการสถานศึกษา',
'มีการนำความรู้ ทักษะ และนวัตกรรมที่ได้จากการพัฒนาตนเองและวิชาชีพมาพัฒนาการบริหารจัดการสถานศึกษา',
2, NOW() FROM `paaspect` WHERE code = 'P5';

-- -----------------------------------------------------------------------------
-- 3. สร้างตาราง PAIndicatorScale (เกณฑ์คะแนน 1-4)
-- -----------------------------------------------------------------------------
CREATE TABLE `paindicatorscale` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `indicatorId` BIGINT NOT NULL,
  `score` TINYINT NOT NULL,
  `labelTh` VARCHAR(255) NOT NULL,
  `descriptionTh` TEXT NULL,
  `criteriaTh` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `paindicatorscale_indicatorId_score_key` (`indicatorId`, `score`),
  
  FOREIGN KEY (`indicatorId`) REFERENCES `paindicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลเริ่มต้น: เกณฑ์คะแนน 1-4 สำหรับทุกตัวชี้วัด
INSERT INTO `paindicatorscale` (`indicatorId`, `score`, `labelTh`, `descriptionTh`)
SELECT id, 1, 'ปฏิบัติได้ต่ำกว่าระดับที่คาดหวังมาก', 
'มีการดำเนินการแต่ยังไม่บรรลุตามเกณฑ์ที่กำหนด ต้องปรับปรุงอย่างมาก' FROM `paindicator`;

INSERT INTO `paindicatorscale` (`indicatorId`, `score`, `labelTh`, `descriptionTh`)
SELECT id, 2, 'ปฏิบัติได้ต่ำกว่าระดับที่คาดหวัง', 
'มีการดำเนินการแต่ยังไม่สมบูรณ์ ต้องปรับปรุงเพิ่มเติม' FROM `paindicator`;

INSERT INTO `paindicatorscale` (`indicatorId`, `score`, `labelTh`, `descriptionTh`)
SELECT id, 3, 'ปฏิบัติได้ตามระดับที่คาดหวัง', 
'ดำเนินการตามเกณฑ์ที่กำหนดอย่างครบถ้วน' FROM `paindicator`;

INSERT INTO `paindicatorscale` (`indicatorId`, `score`, `labelTh`, `descriptionTh`)
SELECT id, 4, 'ปฏิบัติได้สูงกว่าระดับที่คาดหวัง', 
'ดำเนินการเกินเกณฑ์ที่กำหนด มีนวัตกรรมหรือแนวปฏิบัติที่ดีเยี่ยม' FROM `paindicator`;

-- -----------------------------------------------------------------------------
-- 4. สร้างตาราง PAConsideration (3 ข้อพิจารณา ส่วนที่ 2)
-- -----------------------------------------------------------------------------
CREATE TABLE `paconsideration` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(10) NOT NULL,
  `nameTh` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `maxScore` INT NOT NULL,
  `sortNo` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `paconsideration_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลเริ่มต้น: 3 ข้อพิจารณา
INSERT INTO `paconsideration` (`code`, `nameTh`, `description`, `maxScore`, `sortNo`, `updatedAt`) VALUES
('C1', 'วิธีดำเนินการ', 'พิจารณาจากการดำเนินการที่ถูกต้อง ครบถ้วน เป็นไปตามระยะเวลาที่กำหนดไว้ในข้อตกลง และสะท้อนให้เห็นถึงระดับการปฏิบัติที่คาดหวังตามตำแหน่งและวิทยฐานะ', 20, 1, NOW()),
('C2.1', 'ผลลัพธ์การพัฒนา - เชิงปริมาณ', 'พิจารณาจากการบรรลุเป้าหมายเชิงปริมาณได้ครบถ้วนตามข้อตกลง และมีความถูกต้อง เชื่อถือได้', 10, 2, NOW()),
('C2.2', 'ผลลัพธ์การพัฒนา - เชิงคุณภาพ', 'พิจารณาจากการบรรลุเป้าหมายเชิงคุณภาพได้ครบถ้วน ถูกต้อง เชื่อถือได้ และปรากฏผลต่อคุณภาพผู้เรียน ครู และสถานศึกษา ได้ตามข้อตกลง', 10, 3, NOW());

-- -----------------------------------------------------------------------------
-- 5. สร้างตาราง PAAgreement (ข้อตกลง PA ของแต่ละคน)
-- -----------------------------------------------------------------------------
CREATE TABLE `paagreement` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `schoolId` BIGINT NOT NULL,
  `userId` BIGINT NOT NULL,
  `evaluatorId` BIGINT NULL,
  `fiscalYear` INT NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'EVALUATED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
  `totalScore` DECIMAL(5,2) NULL,
  `part1Score` DECIMAL(5,2) NULL,
  `part2Score` DECIMAL(5,2) NULL,
  `isPassed` BOOLEAN NULL,
  `passReason` TEXT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `createdBy` BIGINT NULL,
  `updatedBy` BIGINT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `paagreement_userId_fiscalYear_key` (`userId`, `fiscalYear`),
  INDEX `paagreement_schoolId_fiscalYear_idx` (`schoolId`, `fiscalYear`),
  INDEX `paagreement_status_idx` (`status`),
  
  FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. สร้างตาราง PAAgreementItem (รายการประเมินแต่ละตัวชี้วัด)
-- -----------------------------------------------------------------------------
CREATE TABLE `paagreementitem` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `agreementId` BIGINT NOT NULL,
  `indicatorId` BIGINT NOT NULL,
  `score` TINYINT NULL,
  `scoreValue` DECIMAL(5,2) NULL,
  `comment` TEXT NULL,
  `evaluatorNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `paagreementitem_agreementId_indicatorId_key` (`agreementId`, `indicatorId`),
  INDEX `paagreementitem_agreementId_idx` (`agreementId`),
  INDEX `paagreementitem_indicatorId_idx` (`indicatorId`),
  
  FOREIGN KEY (`agreementId`) REFERENCES `paagreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`indicatorId`) REFERENCES `paindicator`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. สร้างตาราง PAChallengeItem (ประเด็นท้าทาย ส่วนที่ 2)
-- -----------------------------------------------------------------------------
CREATE TABLE `pachallengeitem` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `agreementId` BIGINT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `objectives` TEXT NULL,
  `c1MethodScore` TINYINT NULL,
  `c1MethodComment` TEXT NULL,
  `c21QuantScore` TINYINT NULL,
  `c21QuantComment` TEXT NULL,
  `c22QualScore` TINYINT NULL,
  `c22QualComment` TEXT NULL,
  `part2Total` DECIMAL(5,2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `pachallengeitem_agreementId_key` (`agreementId`),
  
  FOREIGN KEY (`agreementId`) REFERENCES `paagreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. สร้างตาราง PAChallengeConsideration
-- -----------------------------------------------------------------------------
CREATE TABLE `pachallengeconsideration` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `challengeId` BIGINT NOT NULL,
  `considerationId` BIGINT NOT NULL,
  `score` TINYINT NULL,
  `scoreValue` DECIMAL(5,2) NULL,
  `comment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `pachallengeconsideration_challengeId_considerationId_key` (`challengeId`, `considerationId`),
  
  FOREIGN KEY (`challengeId`) REFERENCES `pachallengeitem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`considerationId`) REFERENCES `paconsideration`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. สร้างตาราง PAEvidenceMapping (เชื่อมหลักฐานกับ PA)
-- -----------------------------------------------------------------------------
CREATE TABLE `paevidencemapping` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `evidenceId` BIGINT NOT NULL,
  `agreementItemId` BIGINT NULL,
  `challengeConsiderationId` BIGINT NULL,
  `note` TEXT NULL,
  `relevanceLevel` TINYINT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdBy` BIGINT NULL,
  
  PRIMARY KEY (`id`),
  INDEX `paevidencemapping_evidenceId_idx` (`evidenceId`),
  INDEX `paevidencemapping_agreementItemId_idx` (`agreementItemId`),
  INDEX `paevidencemapping_challengeConsiderationId_idx` (`challengeConsiderationId`),
  
  FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`agreementItemId`) REFERENCES `paagreementitem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`challengeConsiderationId`) REFERENCES `pachallengeconsideration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. สร้างตาราง PASummary (สรุปผลการประเมิน)
-- -----------------------------------------------------------------------------
CREATE TABLE `pasummary` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `schoolId` BIGINT NOT NULL,
  `userId` BIGINT NOT NULL,
  `fiscalYear` INT NOT NULL,
  `p1AcademicScore` DECIMAL(5,2) NULL,
  `p2ManagementScore` DECIMAL(5,2) NULL,
  `p3InnovationScore` DECIMAL(5,2) NULL,
  `p4NetworkScore` DECIMAL(5,2) NULL,
  `p5DevelopmentScore` DECIMAL(5,2) NULL,
  `part1Total` DECIMAL(5,2) NULL,
  `c1MethodScore` DECIMAL(5,2) NULL,
  `c2QuantScore` DECIMAL(5,2) NULL,
  `c2QualScore` DECIMAL(5,2) NULL,
  `part2Total` DECIMAL(5,2) NULL,
  `grandTotal` DECIMAL(5,2) NULL,
  `isPassed` BOOLEAN NULL,
  `evaluationLevel` VARCHAR(100) NULL,
  `totalEvidenceCount` INT NOT NULL DEFAULT 0,
  `qaLinkedCount` INT NOT NULL DEFAULT 0,
  `paLinkedCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `pasummary_userId_fiscalYear_key` (`userId`, `fiscalYear`),
  INDEX `pasummary_schoolId_fiscalYear_idx` (`schoolId`, `fiscalYear`),
  
  FOREIGN KEY (`schoolId`) REFERENCES `school`(`sc_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. เพิ่ม Index และ Optimization
-- -----------------------------------------------------------------------------
-- Index สำหรับการค้นหาหลักฐานที่เชื่อมกับทั้ง QA และ PA
CREATE INDEX `paevidencemapping_evidenceId_agreementItemId_idx` 
ON `paevidencemapping`(`evidenceId`, `agreementItemId`);

-- Index สำหรับรายงานสรุป
CREATE INDEX `pasummary_schoolId_fiscalYear_isPassed_idx` 
ON `pasummary`(`schoolId`, `fiscalYear`, `isPassed`);
