import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { profileFromDb, payloadToDbParts } from '@/lib/studentProfileDbMap';

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureStudentProfileRow(session.user.id);

    const row = await query(
      `SELECT sp.*, u.email AS account_email, u.phone AS user_phone, u.avatar_url
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

    const profile = profileFromDb({
      sp,
      skills: skills.rows,
      accountEmail: sp.account_email,
      userPhone: sp.user_phone,
      avatarUrl: sp.avatar_url,
    });

    return NextResponse.json({ profile });
  } catch (e) {
    console.error('GET /api/student/profile', e);
    if (e.message && e.message.includes('aux_profile')) {
      return NextResponse.json(
        {
          error: 'Database migration required',
          hint: 'Run db/migrations/010_student_profile_aux.sql on your database.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const accountEmail = session.user.email || '';
    const parts = payloadToDbParts({ ...body, emails: body.emails, phones: body.phones });

    if (parts.cgpa != null && (parts.cgpa < 0 || parts.cgpa > 10)) {
      return NextResponse.json({ error: 'CGPA must be between 0 and 10' }, { status: 400 });
    }

    await ensureStudentProfileRow(session.user.id);

    await transaction(async (client) => {
      const idRes = await client.query(`SELECT id FROM student_profiles WHERE user_id = $1::uuid`, [
        session.user.id,
      ]);
      if (!idRes.rows.length) {
        throw new Error('Student profile missing');
      }
      const studentProfileId = idRes.rows[0].id;

      await client.query(
        `UPDATE student_profiles SET
           department = $1,
           branch = $2,
           batch_year = $3,
           graduation_year = $4,
           cgpa = $5,
           tenth_percentage = $6,
           twelfth_percentage = $7,
           gender = $8,
           bio = $9,
           linkedin_url = $10,
           github_url = $11,
           portfolio_url = $12,
           expected_salary_min = $13,
           expected_salary_max = $14,
           preferred_locations = $15,
           willing_to_relocate = $16,
           aux_profile = $17::jsonb,
           updated_at = NOW()
         WHERE user_id = $18::uuid`,
        [
          parts.department,
          parts.branch,
          parts.batch_year,
          parts.graduation_year,
          parts.cgpa,
          parts.tenth_percentage,
          parts.twelfth_percentage,
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

      await client.query(`UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2::uuid`, [
        parts.user_phone,
        session.user.id,
      ]);

      await client.query(`DELETE FROM student_skills WHERE student_id = $1::uuid`, [studentProfileId]);
      for (const skill of parts.skills) {
        await client.query(
          `INSERT INTO student_skills (student_id, skill_name, proficiency) VALUES ($1::uuid, $2, 'intermediate')`,
          [studentProfileId, skill]
        );
      }
    });

    const refreshed = await query(
      `SELECT sp.*, u.email AS account_email, u.phone AS user_phone, u.avatar_url
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
    const profile = profileFromDb({
      sp,
      skills: skills.rows,
      accountEmail: sp.account_email,
      userPhone: sp.user_phone,
      avatarUrl: sp.avatar_url,
    });

    return NextResponse.json({ profile });
  } catch (e) {
    console.error('PUT /api/student/profile', e);
    if (e.message && e.message.includes('aux_profile')) {
      return NextResponse.json(
        {
          error: 'Database migration required',
          hint: 'Run db/migrations/010_student_profile_aux.sql on your database.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
