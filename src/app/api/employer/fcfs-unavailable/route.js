import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  FCFS_TRACKS,
  fcfsTrackFromAssessmentKind,
  listCampusFcfsUnavailableForEmployer,
  isCampusFcfsEnabled,
} from '@/lib/campusFcfsSelection';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerId(session) {
  const userId = session?.user?.id || session?.user?.sub;
  if (!userId) return null;
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

const TAB_LABELS = {
  internship: 'Internships',
  jobs: 'Jobs',
  placement: 'Placement',
};

/** GET ?tenantId=&tab=internship|jobs|placement */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerId(session);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = String(searchParams.get('tenantId') || '').trim();
    let tab = String(searchParams.get('tab') || 'internship').trim().toLowerCase();
    if (tab === 'drive') tab = 'placement';
    if (!FCFS_TRACKS.includes(tab)) {
      return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
    }
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const fcfsEnabled = await isCampusFcfsEnabled(tenantId);
    const items = fcfsEnabled
      ? await listCampusFcfsUnavailableForEmployer(tenantId, tab, employerId)
      : [];

    const counts = {};
    for (const t of FCFS_TRACKS) {
      counts[t] = t === tab
        ? items.length
        : (await listCampusFcfsUnavailableForEmployer(tenantId, t, employerId)).length;
    }

    return NextResponse.json({
      tab,
      tabLabel: TAB_LABELS[tab] || tab,
      fcfsEnabled,
      tenantId,
      items,
      counts,
      assessmentTabHint: fcfsTrackFromAssessmentKind(tab === 'placement' ? 'drive' : tab),
    });
  } catch (e) {
    console.error('GET /api/employer/fcfs-unavailable', e);
    return NextResponse.json({ error: 'Failed to load unavailable candidates' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_fcfs_unavailable' });
export const GET = __platformApiHandlers.GET;
