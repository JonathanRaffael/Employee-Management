-- ============================================
-- SYNC FORM STATUS FROM APPROVAL STATUS
-- ============================================

-- 1. UPDATE form status ke APPROVED jika HRD sudah APPROVED
UPDATE "Form" f
SET status = 'APPROVED'
WHERE id IN (
  SELECT DISTINCT a."formId"
  FROM "Approval" a
  WHERE a.role = 'HRD'
    AND a.status = 'APPROVED'
)
AND status != 'APPROVED';

-- 2. UPDATE form status ke REJECTED jika HRD sudah REJECTED
UPDATE "Form" f
SET status = 'REJECTED'
WHERE id IN (
  SELECT DISTINCT a."formId"
  FROM "Approval" a
  WHERE a.role = 'HRD'
    AND a.status = 'REJECTED'
)
AND status != 'REJECTED';

-- 3. Verify hasil update
SELECT 
  f.id,
  f.type,
  f.status as "formStatus",
  a.status as "hrdApprovalStatus",
  CASE 
    WHEN f.status != a.status THEN 'MISMATCH'
    ELSE 'OK'
  END as status_sync
FROM "Form" f
LEFT JOIN "Approval" a 
  ON f.id = a."formId" 
  AND a.role = 'HRD'
WHERE f.status IN ('APPROVED', 'REJECTED')
ORDER BY f."createdAt" DESC
LIMIT 50;