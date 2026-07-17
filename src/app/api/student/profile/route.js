import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { profileFromDb, payloadToDbParts } from '@/lib/studentProfileDbMap';
import { resolveStudentResumeUrl, resolveStudentResumeFileName } from '@/lib/studentResumeUrl';
import { validateStudentAcademicScores, getPhonesListValidationError } from '@/lib/validators';
import {
  validateStudentAcademicPayload,
  validateEducationDetailsPayload,
  validateStudentProfileEmailsPayload,
} from '@/lib/apiInputValidation';
import { resolveAlumniStudentFlag } from '@/lib/studentAlumniServer';
import {
  applyCollegeControlledProfileFields,
  checkStudentCollegeFieldViolations,
  mergeStudentAuxProfilePreservingCollegeFields,
} from '@/lib/studentCollegeControlledFields';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function ensureStudentProfileRow(userId) {
  const ins = await query(
    `INSERT INTO student_profiles (user_id, tenant_id, batch_year, graduation_year)
     SELECT u.id, u.tenant_id,
            EXTRACT(YEAR FROM NOW())::int - 4,
            EXTRACT(YEAR FROM NOW())::int
     FROM users u
     WHERE u.id = $1::uuid AND u.role = 'student'
       AND NOT EXISTS (SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id)
     RETURNING id`,
    [userId]
  );
  return ins.rows[0]?.id || null;
}

async function hasAuxProfileColumn() {
  const res = await query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'student_profiles'
       AND column_name = 'aux_profile'
     LIMIT 1`
  );
  return res.rows.length > 0;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureStudentProfileRow(session.user.id);

    const row = await query(
      `SELECT sp.*, u.email AS account_email, u.communication_email, u.phone AS user_phone, u.avatar_url
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1::uuid`,
      [session.user.id]
    );

    if (!row.rows.length) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const sp = row.rows[0];
    const skills = await query(
      `SELECT skill_name FROM student_skills WHERE student_id = $1::uuid ORDER BY created_at ASC`,
      [sp.id]
    );
    const projects = await query(
      `SELECT title, description, tech_stack, project_url, github_url, start_date, end_date
       FROM student_projects
       WHERE student_id = $1::uuid
       ORDER BY COALESCE(end_date, start_date) DESC NULLS LAST, created_at DESC`,
      [sp.id]
    );
    const documents = await query(
      `SELECT document_type, document_name, file_url, uploaded_at
       FROM student_documents
       WHERE student_id = $1::uuid
       ORDER BY uploaded_at DESC`,
      [sp.id],
    );
    const documentRows = documents.rows.map((row) => ({
      type: row.document_type,
      name: row.document_name,
      url: row.file_url,
      uploadedAt: row.uploaded_at,
    }));

    const profile = profileFromDb({
      sp,
      skills: skills.rows,
      projects: projects.rows,
      accountEmail: sp.account_email,
      communicationEmail: sp.communication_email,
      userPhone: sp.user_phone,
      avatarUrl: sp.avatar_url,
    });
    profile.resumeUrl = resolveStudentResumeUrl({
      resumeUrl: sp.resume_url,
      documents: documentRows,
    });
    profile.cvFileName = resolveStudentResumeFileName({
      resumeUrl: profile.resumeUrl || sp.resume_url,
      documents: documentRows,
      cvFileName: profile.cvFileName,
    });

    const isAlumni = await resolveAlumniStudentFlag(session.user.id, session.user);
    profile.isAlumni = isAlumni;

    return NextResponse.json({ profile, isAlumni });
  } catch (e) {
    console.error('GET /api/student/profile', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

async function __platform_PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const forbiddenNameFields = ['firstName', 'lastName', 'first_name', 'last_name', 'name', 'fullName'];
    for (const field of forbiddenNameFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return NextResponse.json(
          { error: 'Your name cannot be changed here. Contact your placement office or super admin.' },
          { status: 403 }
        );
      }
    }

    const accountEmail = session.user.email || '';

    await ensureStudentProfileRow(session.user.id);

    const existingRes = await query(
      `SELECT cgpa, department, branch, batch_year, graduation_year, joining_academic_year, aux_profile
       FROM student_profiles WHERE user_id = $1::uuid`,
      [session.user.id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const collegeFieldErr = checkStudentCollegeFieldViolations(body, existing);
    if (collegeFieldErr) {
      return NextResponse.json({ error: collegeFieldErr }, { status: 403 });
    }

    const existingCgpa = existing.cgpa ?? null;

    let parts = payloadToDbParts({ ...body, emails: body.emails, phones: body.phones, communicationEmail: body.communicationEmail });
    parts = applyCollegeControlledProfileFields(parts, existing);
    parts.aux_profile = mergeStudentAuxProfilePreservingCollegeFields(
      existing.aux_profile,
      parts.aux_profile,
    );

    const academicErr = validateStudentAcademicScores({
      cgpa: existingCgpa,
      tenthPercentage: parts.tenth_percentage,
      twelfthPercentage: parts.twelfth_percentage,
      diplomaPercentage: parts.diploma_percentage,
    });
    if (academicErr) {
      return NextResponse.json({ error: academicErr }, { status: 400 });
    }

    const isAlumni = await resolveAlumniStudentFlag(session.user.id, session.user);

    const salaryPayloadErr = validateStudentAcademicPayload({
      cgpa: existingCgpa,
      tenthPercentage: parts.tenth_percentage,
      twelfthPercentage: parts.twelfth_percentage,
      diplomaPercentage: parts.diploma_percentage,
      batchYear: parts.batch_year ?? body.batchYear,
      graduationYear: parts.graduation_year ?? body.graduationYear,
      backlogsActive: parts.backlogs_active,
      backlogsHistory: parts.backlogs_history,
      expectedSalaryMin: parts.expected_salary_min ?? body.expectedSalaryMin,
      expectedSalaryMax: parts.expected_salary_max ?? body.expectedSalaryMax,
      isAlumni,
    });
    if (salaryPayloadErr) {
      return NextResponse.json({ error: salaryPayloadErr }, { status: 400 });
    }

    const educationErr = validateEducationDetailsPayload(body.educationDetails);
    if (educationErr) {
      return NextResponse.json({ error: educationErr }, { status: 400 });
    }

    const phoneErr = getPhonesListValidationError(body.phones);
    if (phoneErr) {
      return NextResponse.json({ error: phoneErr }, { status: 400 });
    }

    const emailErr = validateStudentProfileEmailsPayload({
      communicationEmail: body.communicationEmail,
      emails: body.emails,
    });
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }

    const auxProfileAvailable = await hasAuxProfileColumn();

    await transaction(async (client) => {
      const idRes = await client.query(`SELECT id FROM student_profiles WHERE user_id = $1::uuid`, [
        session.user.id,
      ]);
      if (!idRes.rows.length) {
        throw new Error('Student profile missing');
      }
      const studentProfileId = idRes.rows[0].id;

      if (auxProfileAvailable) {
        await client.query(
          `UPDATE student_profiles SET
             department = $1,
             branch = $2,
             batch_year = $3,
             graduation_year = $4,
             tenth_percentage = $5,
             twelfth_percentage = $6,
             diploma_percentage = $7,
             backlogs_active = $8,
             backlogs_history = $9,
             gender = $10,
             bio = $11,
             linkedin_url = $12,
             github_url = $13,
             portfolio_url = $14,
             expected_salary_min = $15,
             expected_salary_max = $16,
             preferred_locations = $17,
             willing_to_relocate = $18,
             aux_profile = $19::jsonb,
             updated_at = NOW()
           WHERE user_id = $20::uuid`,
          [
            parts.department,
            parts.branch,
            parts.batch_year,
            parts.graduation_year,
            parts.tenth_percentage,
            parts.twelfth_percentage,
            parts.diploma_percentage,
            parts.backlogs_active,
            parts.backlogs_history,
            parts.gender,
            parts.bio,
            parts.linkedin_url,
            parts.github_url,
            parts.portfolio_url,
            parts.expected_salary_min,
            parts.expected_salary_max,
            parts.preferred_locations,
            parts.willing_to_relocate,
            JSON.stringify(parts.aux_profile),
            session.user.id,
          ]
        );
      } else {
        await client.query(
          `UPDATE student_profiles SET
             department = $1,
             branch = $2,
             batch_year = $3,
             graduation_year = $4,
             tenth_percentage = $5,
             twelfth_percentage = $6,
             diploma_percentage = $7,
             backlogs_active = $8,
             backlogs_history = $9,
             gender = $10,
             bio = $11,
             linkedin_url = $12,
             github_url = $13,
             portfolio_url = $14,
             expected_salary_min = $15,
             expected_salary_max = $16,
             preferred_locations = $17,
             willing_to_relocate = $18,
             updated_at = NOW()
           WHERE user_id = $19::uuid`,
          [
            parts.department,
            parts.branch,
            parts.batch_year,
            parts.graduation_year,
            parts.tenth_percentage,
            parts.twelfth_percentage,
            parts.diploma_percentage,
            parts.backlogs_active,
            parts.backlogs_history,
            parts.gender,
            parts.bio,
            parts.linkedin_url,
            parts.github_url,
            parts.portfolio_url,
            parts.expected_salary_min,
            parts.expected_salary_max,
            parts.preferred_locations,
            parts.willing_to_relocate,
            session.user.id,
          ]
        );
      }

      await client.query(`UPDATE users SET phone = $1, communication_email = $2, updated_at = NOW() WHERE id = $3::uuid`, [
        parts.user_phone,
        parts.user_communication_email,
        session.user.id,
      ]);

      await client.query(`DELETE FROM student_skills WHERE student_id = $1::uuid`, [studentProfileId]);
      for (const skill of parts.skills) {
        await client.query(
          `INSERT INTO student_skills (student_id, skill_name, proficiency) VALUES ($1::uuid, $2, 'intermediate')`,
          [studentProfileId, skill]
        );
      }

      await client.query(`DELETE FROM student_projects WHERE student_id = $1::uuid`, [studentProfileId]);
      for (const project of parts.projects) {
        await client.query(
          `INSERT INTO student_projects
             (student_id, title, description, tech_stack, project_url, github_url, start_date, end_date)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
          [
            studentProfileId,
            project.title || 'Untitled project',
            project.description || null,
            project.techStack.length ? project.techStack : null,
            project.projectUrl || null,
            project.githubUrl || null,
            project.startDate || null,
            project.endDate || null,
          ]
        );
      }
    });

    const refreshed = await query(
      `SELECT sp.*, u.email AS account_email, u.communication_email, u.phone AS user_phone, u.avatar_url
       FROM student_profiles sp
       INNER JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1::uuid`,
      [session.user.id]
    );
    const sp = refreshed.rows[0];
    const skills = await query(
      `SELECT skill_name FROM student_skills WHERE student_id = $1::uuid ORDER BY created_at ASC`,
      [sp.id]
    );
    const projects = await query(
      `SELECT title, description, tech_stack, project_url, github_url, start_date, end_date
       FROM student_projects
       WHERE student_id = $1::uuid
       ORDER BY COALESCE(end_date, start_date) DESC NULLS LAST, created_at DESC`,
      [sp.id]
    );
    const profile = profileFromDb({
      sp,
      skills: skills.rows,
      projects: projects.rows,
      accountEmail: sp.account_email,
      communicationEmail: sp.communication_email,
      userPhone: sp.user_phone,
      avatarUrl: sp.avatar_url,
    });
    profile.isAlumni = isAlumni;

    return NextResponse.json({ profile, isAlumni });
  } catch (e) {
    console.error('PUT /api/student/profile', e);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PUT: __platform_PUT,
}, { context: 'api_student_profile' });
export const GET = __platformApiHandlers.GET;
export const PUT = __platformApiHandlers.PUT;
