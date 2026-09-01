-- ซ่อมข้อมูลก่อนสร้าง unique index
-- บั๊กเดิม: nextEvidenceCode นับจากจำนวนแถวที่ del = false พอมีการ soft delete
-- จำนวนจะลดลงและรหัสถัดไปชนกับรหัสที่ออกไปแล้ว — ฐานข้อมูลที่ใช้งานอยู่จึงอาจมีรหัสซ้ำค้างอยู่
-- ตรงนี้เก็บแถวที่ id น้อยสุดของแต่ละกลุ่มไว้ตามเดิม แล้วออกเลขใหม่ต่อท้ายชุดให้แถวที่เหลือ
UPDATE `evidence` AS e
JOIN (
  SELECT
    d.id,
    CONCAT(d.prefix, '-', LPAD(COALESCE(m.maxNum, 0) + d.seq, 2, '0')) AS newCode
  FROM (
    SELECT
      x.id,
      x.indicatorId,
      x.fiscalYear,
      SUBSTRING_INDEX(x.evidenceCode, '-', 1) AS prefix,
      ROW_NUMBER() OVER (
        PARTITION BY x.indicatorId, x.fiscalYear, SUBSTRING_INDEX(x.evidenceCode, '-', 1)
        ORDER BY x.id
      ) AS seq
    FROM (
      SELECT
        id,
        indicatorId,
        fiscalYear,
        evidenceCode,
        ROW_NUMBER() OVER (
          PARTITION BY indicatorId, fiscalYear, evidenceCode
          ORDER BY id
        ) AS rn
      FROM `evidence`
      WHERE evidenceCode IS NOT NULL
    ) AS x
    WHERE x.rn > 1
  ) AS d
  LEFT JOIN (
    SELECT
      indicatorId,
      fiscalYear,
      SUBSTRING_INDEX(evidenceCode, '-', 1) AS prefix,
      MAX(CAST(SUBSTRING_INDEX(evidenceCode, '-', -1) AS UNSIGNED)) AS maxNum
    FROM `evidence`
    WHERE evidenceCode REGEXP '^.+-[0-9]+$'
    GROUP BY indicatorId, fiscalYear, SUBSTRING_INDEX(evidenceCode, '-', 1)
  ) AS m
    ON m.indicatorId = d.indicatorId
   AND m.fiscalYear = d.fiscalYear
   AND m.prefix = d.prefix
) AS r ON r.id = e.id
SET e.evidenceCode = r.newCode;

-- CreateIndex
CREATE UNIQUE INDEX `evidence_indicatorId_fiscalYear_evidenceCode_key` ON `evidence`(`indicatorId`, `fiscalYear`, `evidenceCode`);
