import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAssessmentRoundKind } from '@/lib/assessmentRoundMap';
import {
  getAllEmployerRoundMaps,
  getEmployerRoundMapForKind,
  saveEmployerRoundMap,
} from '@/lib/assessmentRoundMapDb';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerProfileId(userId) {
  const res = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  return res.rows[0]?.id || null;
}

/** GET — round display map for one kind or all kinds. */
async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session.user.id);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const kind = new URL(request.url).searchParams.get('kind');
    if (kind && !isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    if (kind) {
      return NextResponse.json({ kind, rounds: await getEmployerRoundMapForKind(employerId, kind) });
    }

    return NextResponse.json({ maps: await getAllEmployerRoundMaps(employerId) });
  } catch (e) {
    console.error('GET /api/employer/assessment-round-map', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Run migration 068_employer_assessment_round_defaults.sql' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to load round map' }, { status: 500 });
  }
}

/** PUT — save five round labels for one opportunity kind. */
async function __platform_PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerProfileId(session.user.id);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const kind = String(body?.kind || '').trim();
    if (!isAssessmentRoundKind(kind)) {
      return NextResponse.json({ error: 'kind must be internship, jobs, drive, or projects' }, { status: 400 });
    }

    const inputRounds = Array.isArray(body?.rounds) ? body.rounds : [];
    const rounds = await saveEmployerRoundMap(employerId, kind, inputRounds);

    return NextResponse.json({ ok: true, kind, rounds });
  } catch (e) {
    console.error('PUT /api/employer/assessment-round-map', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Run migration 068_employer_assessment_round_defaults.sql' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to save round map' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PUT: __platform_PUT,
}, { context: 'api_employer_assessment_round_map' });
export const GET = __platformApiHandlers.GET;
export const PUT = __platformApiHandlers.PUT;
