SELECT pa.id as application_id, sp.user_id, pa.status, jp.job_type
FROM program_applications pa
JOIN student_profiles sp ON pa.student_id = sp.id
LIMIT 5;
