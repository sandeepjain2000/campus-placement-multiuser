-- Alumni jobs require college approval; undo auto-approve rows that were never actioned by an admin.

UPDATE job_posting_visibility jpv
SET college_status = 'pending',
    approved_at = NULL,
    approved_by = NULL
FROM job_postings jp
WHERE jp.id = jpv.job_id
  AND jp.job_type IN ('full_time', 'contract')
  AND jpv.college_status = 'approved'
  AND jpv.approved_by IS NULL
  AND COALESCE(jp.is_deleted, false) = false;
