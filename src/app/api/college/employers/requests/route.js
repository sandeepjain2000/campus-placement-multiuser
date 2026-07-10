import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    // Fetch pending approvals for this college
    const result = await query(`
      SELECT ea.id as approval_id, ea.status, ea.created_at,
             ep.id as employer_id, ep.company_name, ep.industry, ep.website
      FROM employer_approvals ea
      JOIN employer_profiles ep ON ea.employer_id = ep.id
      WHERE ea.tenant_id = $1 AND ea.status = 'pending'
      ORDER BY ea.created_at DESC
    `, [tenantId]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching employer requests:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_employers_requests' });
export const GET = __platformApiHandlers.GET;
