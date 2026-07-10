SELECT pa.id, pa.student_id, sp.user_id FROM program_applications pa JOIN student_profiles sp ON pa.student_id = sp.id LIMIT 5;
