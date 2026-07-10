import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { hash } from 'bcryptjs';
import { parseCsvLine } from '@/lib/csvParse';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'File is empty or missing headers' }, { status: 400 });
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const expectedHeaders = ['name', 'email', 'rollnumber', 'department', 'cgpa'];

    if (!expectedHeaders.every((h) => headers.includes(h))) {
      return NextResponse.json({ error: `Missing required headers. Expected: ${expectedHeaders.join(', ')}` }, { status: 400 });
    }

    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const rollIdx = headers.indexOf('rollnumber');
    const deptIdx = headers.indexOf('department');
    const cgpaIdx = headers.indexOf('cgpa');

    let processedCount = 0;
    const errors = [];
    /** @type {{ email: string, temporaryPassword: string }[]} */
    const newUserCredentials = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      if (parts.length < expectedHeaders.length) continue;

      const name = parts[nameIdx];
      const email = parts[emailIdx];
      const rollNumber = parts[rollIdx];
      const department = parts[deptIdx];
      const cgpa = parseFloat(parts[cgpaIdx]);

      try {
        if (!email || !name || !rollNumber || !department || Number.isNaN(cgpa)) {
          throw new Error('Missing required values (name/email/rollNumber/department/cgpa)');
        }

        const [firstName, ...rest] = name.split(/\s+/);
        const lastName = rest.join(' ') || null;
        const normalizedEmail = email.toLowerCase();

        const existingUser = await query(`SELECT id, tenant_id FROM users WHERE email = $1 LIMIT 1`, [normalizedEmail]);

        let userId = existingUser.rows[0]?.id || null;
        if (existingUser.rows[0] && existingUser.rows[0].tenant_id !== tenantId) {
          throw new Error('Email already exists in another tenant');
        }

        if (!userId) {
          const oneTimePassword = randomBytes(15).toString('base64url');
          const passwordHash = await hash(oneTimePassword, 10);
          const insertedUser = await query(
            `INSERT INTO users (
               tenant_id, email, password_hash, role, first_name, last_name, is_verified, is_active
             ) VALUES ($1, $2, $3, 'student', $4, $5, true, true)
             RETURNING id`,
            [tenantId, normalizedEmail, passwordHash, firstName || 'Student', lastName]
          );
          userId = insertedUser.rows[0]?.id;
          newUserCredentials.push({ email: normalizedEmail, temporaryPassword: oneTimePassword });
        } else {
          await query(
            `UPDATE users
             SET first_name = $1, last_name = $2, role = 'student', is_active = true, updated_at = NOW()
             WHERE id = $3`,
            [firstName || 'Student', lastName, userId]
          );
        }

        await query(
          `INSERT INTO student_profiles (
             user_id, tenant_id, roll_number, department, cgpa, placement_status, is_verified
           ) VALUES ($1, $2, $3, $4, $5, 'unplaced', true)
           ON CONFLICT (user_id) DO UPDATE SET
             tenant_id = EXCLUDED.tenant_id,
             roll_number = EXCLUDED.roll_number,
             department = EXCLUDED.department,
             cgpa = EXCLUDED.cgpa,
             updated_at = NOW()`,
          [userId, tenantId, rollNumber, department, cgpa]
        );

        processedCount++;
      } catch (err) {
        errors.push(`Row ${i + 1} (${email}): ${err.message}`);
      }
    }

    if (processedCount === 0 && errors.length > 0) {
      return NextResponse.json({ error: 'Failed to process any records', details: errors }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedCount} student(s)`,
      newUserCredentials: newUserCredentials.length > 0 ? newUserCredentials : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
