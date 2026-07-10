import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenant_id, id: user_id } = session.user;
    const { approval_id, action, rejection_reason } = await req.json(); // action: 'approve' or 'reject'

    if (!approval_id || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await query(
      `UPDATE employer_approvals 
       SET status = $1, approved_by = $2, approved_at = NOW(), rejection_reason = $3
       WHERE id = $4::uuid AND tenant_id = $5::uuid 
       RETURNING id, status`,
      [newStatus, user_id, rejection_reason || null, approval_id, tenant_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Approval record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Approval API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
