import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireDataEntrySession, resolveDataEntryTenantId } from '@/lib/dataEntryAccess';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

async function __platform_GET(request) {
  try {
    const gate = await requireDataEntrySession();
    if (!gate.ok) return gate.response;

    const tenantId = resolveDataEntryTenantId(gate.session, request.nextUrl.searchParams.get('tenantId'));
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const [tenantUsersRes, studentUsersRes, studentsRes, drivesRes, employersRes] = await Promise.all([
      query(
        `SELECT id, email, first_name, last_name, role
         FROM users
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 300`,
        [tenantId]
      ),
      query(
        `SELECT id, email, first_name, last_name, role
         FROM users
         WHERE tenant_id = $1 AND role = 'student'
         ORDER BY created_at DESC
         LIMIT 200`,
        [tenantId]
      ),
      query(
        `SELECT sp.id, sp.user_id, sp.department, sp.cgpa, sp.placement_status,
                u.email, u.first_name, u.last_name
         FROM student_profiles sp
         LEFT JOIN users u ON u.id = sp.user_id
         WHERE sp.tenant_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
         ORDER BY sp.created_at DESC
         LIMIT 200`,
        [tenantId]
      ),
      query(
        `SELECT id, title, status, drive_date
         FROM placement_drives d
         WHERE d.tenant_id = $1 ${AND_DRIVE_NOT_DELETED}
         ORDER BY created_at DESC
         LIMIT 200`,
        [tenantId]
      ),
      query(
        `SELECT id, company_name
         FROM employer_profiles
         ORDER BY created_at DESC
         LIMIT 200`
      ),
    ]);

    return NextResponse.json({
      tenantUsers: tenantUsersRes.rows,
      studentUsers: studentUsersRes.rows,
      studentProfiles: studentsRes.rows,
      drives: drivesRes.rows,
      employers: employersRes.rows,
    });
  } catch (error) {
    console.error('Failed to load data-entry options:', error);
    return NextResponse.json({ error: 'Failed to load options' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_data_entry_options' });
export const GET = __platformApiHandlers.GET;
