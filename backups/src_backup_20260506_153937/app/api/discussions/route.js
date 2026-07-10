import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function nowLabel() {
  return 'Just now';
}

async function loadTenantSettings(tenantId) {
  const res = await query(`SELECT settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
  return res.rows[0]?.settings || {};
}

async function saveTenantSettings(tenantId, settings) {
  await query(
    `UPDATE tenants
     SET settings = $1::jsonb,
         updated_at = NOW()
     WHERE id = $2::uuid`,
    [JSON.stringify(settings), tenantId]
  );
}

function resolveTenantId(session, searchParams) {
  if (session?.user?.role === 'college_admin' || session?.user?.role === 'student') {
    return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
  }
  return searchParams.get('campusId');
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['college_admin', 'employer', 'super_admin', 'student'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = resolveTenantId(session, searchParams);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const tenantRes = await query(`SELECT name, settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
    const tenant = tenantRes.rows[0];
    if (!tenant) return NextResponse.json({ threads: [] });

    const threads = Array.isArray(tenant.settings?.discussionsThreads) ? tenant.settings.discussionsThreads : [];
    return NextResponse.json({ threads, campusName: tenant.name });
  } catch (error) {
    console.error('GET /api/discussions', error);
    return NextResponse.json({ error: 'Failed to load discussions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['college_admin', 'employer', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const tenantId = resolveTenantId(session, new URL(request.url).searchParams) || body?.campusId || null;
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const topic = String(body?.topic || '').trim();
    if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 });

    const company = String(body?.company || '').trim();
    const campus = String(body?.campus || '').trim();
    const initialText = String(body?.text || '').trim();

    const settings = await loadTenantSettings(tenantId);
    const threads = Array.isArray(settings.discussionsThreads) ? settings.discussionsThreads : [];
    const id = `d-${Date.now()}`;
    const nextThread = {
      id,
      company,
      campus,
      topic,
      lastActivity: nowLabel(),
      replies: initialText
        ? [
            {
              by: session?.user?.name || 'Team',
              text: initialText,
              role: session.user.role === 'college_admin' ? 'college' : 'company',
            },
          ]
        : [],
    };
    settings.discussionsThreads = [nextThread, ...threads];
    await saveTenantSettings(tenantId, settings);
    return NextResponse.json({ threads: settings.discussionsThreads });
  } catch (error) {
    console.error('POST /api/discussions', error);
    return NextResponse.json({ error: 'Failed to create discussion thread' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['college_admin', 'employer', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = resolveTenantId(session, new URL(request.url).searchParams) || body?.campusId || null;
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const threadId = String(body?.threadId || '').trim();
    const text = String(body?.text || '').trim();
    if (!threadId || !text) {
      return NextResponse.json({ error: 'threadId and text are required' }, { status: 400 });
    }

    const settings = await loadTenantSettings(tenantId);
    const threads = Array.isArray(settings.discussionsThreads) ? settings.discussionsThreads : [];
    settings.discussionsThreads = threads.map((t) =>
      String(t.id) === threadId
        ? {
            ...t,
            lastActivity: nowLabel(),
            replies: [
              ...(Array.isArray(t.replies) ? t.replies : []),
              {
                by: session?.user?.name || 'Team',
                text,
                role: session.user.role === 'college_admin' ? 'college' : 'company',
              },
            ],
          }
        : t
    );
    await saveTenantSettings(tenantId, settings);
    return NextResponse.json({ threads: settings.discussionsThreads });
  } catch (error) {
    console.error('PATCH /api/discussions', error);
    return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
  }
}
