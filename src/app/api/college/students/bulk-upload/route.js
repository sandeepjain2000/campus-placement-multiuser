import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { transaction, query } from '@/lib/db';
import { parseCsvLine } from '@/lib/csvParse';
import { parseStudentRow, validateStudentCsvHeaders } from '@/lib/collegeStudentsCsv';
import { sendMail, sendStudentWelcomeEmails } from '@/lib/mailer';
import { SANDBOX_DEFAULT_PASSWORD, SANDBOX_PASSWORD_HASH } from '@/lib/sandboxCredentials';
import {
  assertEmailAvailable,
  formatEmailDifferentTenantMessage,
  formatEmailInUseMessage,
} from '@/lib/userEmail';
import { parseStudentFullName, resolveStudentRollNumber } from '@/lib/validators';
import { resolveCollegeAdminTenantFromSession } from '@/lib/sessionTenant';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveCollegeAdminTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();
    const allLines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (allLines.length < 2) return NextResponse.json({ error: 'File is empty' }, { status: 400 });

    const headerRow = parseCsvLine(allLines[0]);
    const headerCheck = validateStudentCsvHeaders(headerRow);
    if (!headerCheck.ok) {
      return NextResponse.json(
        {
          error: headerCheck.error,
          hint: 'Download the import template from Students and match its column headers exactly.',
        },
        { status: 400 },
      );
    }
    const idx = headerCheck.idx;

    const results = await transaction(async (client) => {
      let processed = 0;
      const errors = [];
      const credentials = [];

      const shortRes = await client.query(
        'SELECT short_code, name FROM tenants WHERE id = $1',
        [tenantId],
      );
      const shortCode = shortRes.rows[0]?.short_code || '';
      const collegeName = shortRes.rows[0]?.name || '';

      for (let i = 1; i < allLines.length; i++) {
        const cells = parseCsvLine(allLines[i]);
        if (cells.every((c) => !String(c || '').trim())) continue;

        const line = i + 1;
        const parsed = parseStudentRow(cells, idx, line, { strictNoBlanks: true });
        if (!parsed.ok) {
          errors.push(parsed.error);
          continue;
        }

        const s = parsed.student;
        const email = s.email;
        const name = s.name;
        const rollRaw = s.roll;

        const nameParsed = parseStudentFullName(name);
        if (nameParsed.error) {
          errors.push(`Row ${line}: ${nameParsed.error}`);
          continue;
        }

        const rollResolved = resolveStudentRollNumber(rollRaw, shortCode);
        if (rollResolved.error) {
          errors.push(`Row ${line}: ${rollResolved.error}`);
          continue;
        }
        const roll = rollResolved.rollNumber;
        const rowSystemId = rollResolved.systemId;

        try {
          const { firstName, lastName, fullName } = nameParsed;

          const existingByRoll = await client.query(
            `SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name, sp.roll_number
             FROM student_profiles sp
             JOIN users u ON u.id = sp.user_id
             WHERE sp.tenant_id = $1 AND LOWER(sp.roll_number) = LOWER($2)
             LIMIT 1`,
            [tenantId, roll],
          );

          let userId;

          if (existingByRoll.rows.length) {
            const ex = existingByRoll.rows[0];
            const existingName = [ex.first_name, ex.last_name].filter(Boolean).join(' ');
            if (existingName.toLowerCase() !== fullName.toLowerCase()) {
              throw new Error(
                `Roll No "${roll}" already belongs to "${existingName}" — Name cannot be changed via import. ` +
                  `To update placement results, keep Name and Email unchanged.`,
              );
            }
            if (ex.email.toLowerCase() !== email.toLowerCase()) {
              throw new Error(
                `Roll No "${roll}" is linked to email "${ex.email}" — Email cannot be changed via import. ` +
                  `Use the correct email for this student.`,
              );
            }

            userId = ex.id;
            await client.query(
              'UPDATE users SET role = $1, is_active = true, updated_at = NOW() WHERE id = $2',
              ['student', userId],
            );
          } else {
            try {
              await assertEmailAvailable(client, email, { tenantId });
            } catch (e) {
              if (e.message === 'EMAIL_DIFFERENT_TENANT') {
                throw new Error(formatEmailDifferentTenantMessage(email));
              }
              if (e.message === 'EMAIL_EXISTS') {
                throw new Error(formatEmailInUseMessage(e.existing, { email }));
              }
              throw e;
            }

            const newUser = await client.query(
              `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, is_verified, is_active, email_verified_at)
               VALUES ($1, $2, $2, $3, 'student', $4, $5, true, true, NOW()) RETURNING id`,
              [tenantId, email, SANDBOX_PASSWORD_HASH, firstName || 'Student', lastName],
            );
            userId = newUser.rows[0].id;
            credentials.push({
              email,
              tempPass: SANDBOX_DEFAULT_PASSWORD,
              firstName: firstName || 'Student',
              systemId: rowSystemId,
              collegeName,
            });
          }

          const auxProfile = JSON.stringify({
            batchLabel: s.joiningAcademicYear || s.batch || '',
            joiningAcademicYear: s.joiningAcademicYear || s.batch || '',
            academicYear: s.academicYear,
            semester: s.semester,
            sectionsImport: s.sectionsCell,
            ...(s.importRemarks ? { importRemarks: s.importRemarks } : {}),
          });

          await client.query(
            `INSERT INTO student_profiles (
              user_id, tenant_id, roll_number, department, branch, cgpa, gender, category,
              placement_status, is_verified, batch_year, graduation_year, joining_academic_year, aux_profile
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
            ON CONFLICT (user_id) DO UPDATE SET
              department = EXCLUDED.department,
              branch = EXCLUDED.branch,
              cgpa = EXCLUDED.cgpa,
              gender = EXCLUDED.gender,
              category = EXCLUDED.category,
              placement_status = EXCLUDED.placement_status,
              is_verified = EXCLUDED.is_verified,
              batch_year = COALESCE(EXCLUDED.batch_year, student_profiles.batch_year),
              graduation_year = COALESCE(EXCLUDED.graduation_year, student_profiles.graduation_year),
              joining_academic_year = COALESCE(EXCLUDED.joining_academic_year, student_profiles.joining_academic_year),
              aux_profile = COALESCE(student_profiles.aux_profile, '{}'::jsonb) || EXCLUDED.aux_profile,
              archived_at = NULL,
              archived_by = NULL,
              updated_at = NOW()`,
            [
              userId,
              tenantId,
              roll,
              s.dept,
              s.specialization,
              s.cgpa,
              s.gender,
              s.diversityCategory,
              s.jobStatus,
              s.verified,
              s.batchYear,
              s.graduationYear,
              s.joiningAcademicYear || s.batch || null,
              auxProfile,
            ],
          );

          processed++;
        } catch (e) {
          errors.push(`Row ${line} (${email}): ${e.message}`);
        }
      }

      return { processed, errors, credentials };
    });

    for (const c of results.credentials) {
      try {
        await sendStudentWelcomeEmails({
          loginEmail: c.email,
          firstName: c.firstName,
          tempPass: c.tempPass,
          systemId: c.systemId,
          collegeName: c.collegeName,
        });
      } catch (mailErr) {
        console.error('[BulkUpload] Welcome email failed:', c.email, mailErr.message);
      }
    }

    try {
      const adminEmail = session.user.communication_email || session.user.email;
      const emailSubject = `Student Import Complete — ${results.processed} success`;
      const emailText =
        `Hello,\n\nYour student import for ${results.processed} students has been processed.\n` +
        (results.errors.length ? `\nErrors found:\n${results.errors.join('\n')}` : '\nNo errors encountered.') +
        ` \n\nThank you,\nPlacementHub Team`;

      await query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES ($1, $2, $3, 'info', false, NOW())`,
        [session.user.id, emailSubject, emailText],
      );

      await query(
        `INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          session.user.id,
          tenantId,
          'student_bulk_import',
          'student_profile',
          JSON.stringify({
            count: results.processed,
            errorCount: results.errors.length,
            summary: emailSubject,
          }),
        ],
      );

      await sendMail({
        to: adminEmail,
        subject: emailSubject,
        text: emailText,
        context: 'college_student_bulk_import',
        userId: session.user.id,
        recipientUserId: session.user.id,
      });
    } catch (notifyError) {
      console.error('Notification/Audit error after bulk upload:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.processed} student(s)${
        results.errors.length ? ` with ${results.errors.length} error(s)` : ''
      }`,
      processed: results.processed,
      errors: results.errors.length ? results.errors : undefined,
      newUserCredentials: results.credentials.length ? results.credentials : undefined,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_college_students_bulk_upload' });
export const POST = __platformApiHandlers.POST;
