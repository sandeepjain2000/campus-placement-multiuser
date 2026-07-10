-- Alumni lateral jobs skip college approval; approve any rows still pending from before auto-approve.

UPDATE job_posting_visibility jpv
SET college_status = 'approved',
    approved_at = COALESCE(jpv.approved_at, NOW())
FROM job_postings jp
WHERE jp.id = jpv.job_id
  AND jp.job_type IN ('full_time', 'contract')
  AND jpv.college_status = 'pending'
  AND COALESCE(jp.is_deleted, false) = false;
