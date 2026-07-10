/** Apply parsed admin student fields to users + student_profiles (+ skills). */

export async function applyCollegeStudentUserFields(client, userId, userFields) {
  if (!userId || !userFields) return;
  const phone = userFields.phone ?? null;
  const communicationEmail = userFields.communication_email ?? null;
  const avatarUrl = userFields.avatar_url ?? null;
  await client.query(
    `UPDATE users SET
       phone = COALESCE($2, phone),
       communication_email = COALESCE($3, communication_email),
       avatar_url = COALESCE($4, avatar_url),
       updated_at = NOW()
     WHERE id = $1::uuid`,
    [userId, phone, communicationEmail, avatarUrl],
  );
}

export async function upsertCollegeStudentProfileRow(
  client,
  { userId, tenantId, rollNumber, profile, auxProfile, existingAux },
) {
  const mergedAux = {
    ...(existingAux && typeof existingAux === 'object' ? existingAux : {}),
    ...auxProfile,
  };

  const result = await client.query(
    `INSERT INTO student_profiles (
       user_id, tenant_id, roll_number, enrollment_number, department, branch,
       batch_year, graduation_year, joining_academic_year, semester_number, program_duration_years,
       cgpa, tenth_percentage, twelfth_percentage,
       diploma_percentage, backlogs_active, backlogs_history, gender, category,
       date_of_birth, placement_status, is_verified, bio, linkedin_url, github_url,
       portfolio_url, resume_url, expected_salary_min, expected_salary_max,
       preferred_locations, willing_to_relocate, aux_profile
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
       $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32::jsonb
     )
     ON CONFLICT (user_id) DO UPDATE SET
       department = EXCLUDED.department,
       branch = EXCLUDED.branch,
       enrollment_number = COALESCE(EXCLUDED.enrollment_number, student_profiles.enrollment_number),
       batch_year = EXCLUDED.batch_year,
       graduation_year = EXCLUDED.graduation_year,
       joining_academic_year = EXCLUDED.joining_academic_year,
       semester_number = EXCLUDED.semester_number,
       program_duration_years = EXCLUDED.program_duration_years,
       cgpa = EXCLUDED.cgpa,
       tenth_percentage = EXCLUDED.tenth_percentage,
       twelfth_percentage = EXCLUDED.twelfth_percentage,
       diploma_percentage = EXCLUDED.diploma_percentage,
       backlogs_active = EXCLUDED.backlogs_active,
       backlogs_history = EXCLUDED.backlogs_history,
       gender = EXCLUDED.gender,
       category = EXCLUDED.category,
       date_of_birth = COALESCE(EXCLUDED.date_of_birth, student_profiles.date_of_birth),
       placement_status = EXCLUDED.placement_status,
       is_verified = EXCLUDED.is_verified,
       bio = EXCLUDED.bio,
       linkedin_url = EXCLUDED.linkedin_url,
       github_url = EXCLUDED.github_url,
       portfolio_url = EXCLUDED.portfolio_url,
       resume_url = EXCLUDED.resume_url,
       expected_salary_min = EXCLUDED.expected_salary_min,
       expected_salary_max = EXCLUDED.expected_salary_max,
       preferred_locations = EXCLUDED.preferred_locations,
       willing_to_relocate = EXCLUDED.willing_to_relocate,
       aux_profile = EXCLUDED.aux_profile,
       archived_at = NULL,
       archived_by = NULL,
       updated_at = NOW()
     RETURNING id, aux_profile`,
    [
      userId,
      tenantId,
      rollNumber,
      profile.enrollment_number,
      profile.department,
      profile.branch,
      profile.batch_year,
      profile.graduation_year,
      profile.joining_academic_year,
      profile.semester_number ?? null,
      profile.program_duration_years ?? 4,
      profile.cgpa,
      profile.tenth_percentage,
      profile.twelfth_percentage,
      profile.diploma_percentage,
      profile.backlogs_active,
      profile.backlogs_history,
      profile.gender,
      profile.category,
      profile.date_of_birth || null,
      profile.placement_status,
      profile.is_verified,
      profile.bio,
      profile.linkedin_url,
      profile.github_url,
      profile.portfolio_url,
      profile.resume_url,
      profile.expected_salary_min,
      profile.expected_salary_max,
      profile.preferred_locations?.length ? profile.preferred_locations : null,
      profile.willing_to_relocate,
      JSON.stringify(mergedAux),
    ],
  );
  return result.rows[0];
}

export async function updateCollegeStudentProfileRow(
  client,
  { profileId, tenantId, profile, auxProfile },
) {
  const existing = await client.query(
    `SELECT aux_profile FROM student_profiles WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [profileId, tenantId],
  );
  if (!existing.rows.length) return null;

  const existingAux = existing.rows[0].aux_profile;
  const mergedAux = {
    ...(existingAux && typeof existingAux === 'object' ? existingAux : {}),
    ...auxProfile,
  };

  await client.query(
    `UPDATE student_profiles SET
       department = $3,
       branch = $4,
       enrollment_number = $5,
       batch_year = $6,
       graduation_year = $7,
       joining_academic_year = $8,
       semester_number = $9,
       program_duration_years = $10,
       cgpa = $11,
       tenth_percentage = $12,
       twelfth_percentage = $13,
       diploma_percentage = $14,
       backlogs_active = $15,
       backlogs_history = $16,
       gender = $17,
       category = $18,
       date_of_birth = $19,
       placement_status = $20,
       is_verified = $21,
       bio = $22,
       linkedin_url = $23,
       github_url = $24,
       portfolio_url = $25,
       resume_url = $26,
       expected_salary_min = $27,
       expected_salary_max = $28,
       preferred_locations = $29,
       willing_to_relocate = $30,
       aux_profile = $31::jsonb,
       updated_at = NOW()
     WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [
      profileId,
      tenantId,
      profile.department,
      profile.branch,
      profile.enrollment_number,
      profile.batch_year,
      profile.graduation_year,
      profile.joining_academic_year,
      profile.semester_number ?? null,
      profile.program_duration_years ?? 4,
      profile.cgpa,
      profile.tenth_percentage,
      profile.twelfth_percentage,
      profile.diploma_percentage,
      profile.backlogs_active,
      profile.backlogs_history,
      profile.gender,
      profile.category,
      profile.date_of_birth || null,
      profile.placement_status,
      profile.is_verified,
      profile.bio,
      profile.linkedin_url,
      profile.github_url,
      profile.portfolio_url,
      profile.resume_url,
      profile.expected_salary_min,
      profile.expected_salary_max,
      profile.preferred_locations?.length ? profile.preferred_locations : null,
      profile.willing_to_relocate,
      JSON.stringify(mergedAux),
    ],
  );
  return profileId;
}

export async function replaceStudentSkills(client, profileId, skills) {
  await client.query('DELETE FROM student_skills WHERE student_id = $1::uuid', [profileId]);
  for (const skill of skills) {
    await client.query(
      'INSERT INTO student_skills (student_id, skill_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [profileId, skill.trim()],
    );
  }
}
