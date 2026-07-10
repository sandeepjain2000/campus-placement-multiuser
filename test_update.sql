UPDATE program_applications 
SET status = 'withdrawn', notes = CONCAT(notes, '\nWithdrawal Reason: ', 'Student cancelled'), updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000000';
