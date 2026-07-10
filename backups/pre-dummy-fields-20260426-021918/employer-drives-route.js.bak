import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { fetchCollegeAdminUserIds, notifyUsersOneAtATime } from '@/lib/notificationService';

async function getEmployerId(userId) {
  const r = await query(`SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
  return r.rows[0] || null;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');

    const drives = await query(
      `SELECT d.id, t.name AS college, d.title AS role, d.drive_date AS date, d.drive_type AS type,
              d.status, d.venue, d.registered_count AS registered
       FROM placement_drives d
       JOIN tenants t ON t.id = d.tenant_id
       WHERE d.employer_id = $1::uuid
         AND ($2::uuid IS NULL OR d.tenant_id = $2::uuid)
       ORDER BY d.drive_date NULLS LAST, d.created_at DESC`,
      [emp.id, campusId || null],
    );

    return NextResponse.json({ drives: drives.rows, companyName: emp.company_name });
  } catch (e) {
    console.error('GET /api/employer/drives', e);
    return NextResponse.json({ error: 'Failed to load drives' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const {
      tenantId,
      title,
      description = '',
      driveType = 'on_campus',
      driveDate = null,
      venue = 'TBD',
      jobId = null,
    } = body;

    if (!tenantId || !title?.trim()) {
      return NextResponse.json({ error: 'tenantId and title are required' }, { status: 400 });
    }

    const allowedTypes = new Set(['on_campus', 'off_campus', 'virtual', 'hybrid']);
    if (!allowedTypes.has(driveType)) {
      return NextResponse.json({ error: 'Invalid driveType' }, { status: 400 });
    }

    const result = await transaction(async (client) => {
      const ok = await client.query(
        `SELECT 1 FROM employer_approvals
         WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'`,
        [tenantId, emp.id],
      );
      if (!ok.rowCount) {
        const e = new Error('No approved partnership with this campus');
        e.statusCode = 403;
        throw e;
      }

      if (jobId) {
        const j = await client.query(
          `SELECT 1 FROM job_postings WHERE id = $1::uuid AND employer_id = $2::uuid`,
          [jobId, emp.id],
        );
        if (!j.rowCount) {
          const e = new Error('jobId must belong to your company');
          e.statusCode = 400;
          throw e;
        }
      }

      const ins = await client.query(
        `INSERT INTO placement_drives (
           tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
           start_time, end_time, venue, status, max_students, registered_count
         ) VALUES (
           $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
           NULL, NULL, $8, 'requested', 100, 0
         )
         RETURNING id, title, drive_date, tenant_id`,
        [tenantId, emp.id, jobId || null, title.trim(), description || '', driveType, driveDate || null, venue || 'TBD'],
      );

      const row = ins.rows[0];
      const college = await client.query(`SELECT name FROM tenants WHERE id = $1::uuid`, [tenantId]);
      const collegeName = college.rows[0]?.name || 'your campus';

      const adminIds = await fetchCollegeAdminUserIds(tenantId, client);
      const dateLabel = row.drive_date
        ? new Date(row.drive_date).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'date TBD';

      await notifyUsersOneAtATime(
        adminIds,
        {
          title: `${emp.company_name} requested a drive`,
          message: `${emp.company_name} submitted a placement drive request: "${row.title}" (${dateLabel}, ${driveType.replace('_', ' ')}). Review and approve in Drives.`,
          type: 'drive',
          link: '/dashboard/college/drives',
        },
        client,
      );

      return {
        ok: true,
        drive: {
          id: row.id,
          college: collegeName,
          role: row.title,
          date: row.drive_date,
          type: driveType,
          status: 'requested',
          registered: 0,
          venue: venue || 'TBD',
        },
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/employer/drives', e);
    const code = e.statusCode || 500;
    return NextResponse.json({ error: e.message || 'Failed to create drive' }, { status: code });
  }
}
