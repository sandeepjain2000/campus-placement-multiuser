import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/sessionUser';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireCollege(session) {
  return session?.user?.role === 'college_admin';
}

async function __platform_POST(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId || !requireCollege(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ideaId = params?.id;
    if (!ideaId) {
      return NextResponse.json({ error: 'Missing idea id' }, { status: 400 });
    }

    const existing = await query(`SELECT id, vote_count FROM feature_ideas WHERE id = $1::uuid`, [ideaId]);
    if (!existing.rows[0]) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const already = await query(
      `SELECT 1 FROM feature_idea_votes WHERE idea_id = $1::uuid AND user_id = $2::uuid`,
      [ideaId, userId],
    );

    if (already.rows[0]) {
      await query(
        `DELETE FROM feature_idea_votes WHERE idea_id = $1::uuid AND user_id = $2::uuid`,
        [ideaId, userId],
      );
      const updated = await query(
        `UPDATE feature_ideas
         SET vote_count = GREATEST(vote_count - 1, 0), updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, vote_count`,
        [ideaId],
      );
      return NextResponse.json({
        id: updated.rows[0].id,
        vote_count: updated.rows[0].vote_count,
        voted_by_me: false,
      });
    }

    await query(
      `INSERT INTO feature_idea_votes (idea_id, user_id) VALUES ($1::uuid, $2::uuid)`,
      [ideaId, userId],
    );
    const updated = await query(
      `UPDATE feature_ideas
       SET vote_count = vote_count + 1, updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, vote_count`,
      [ideaId],
    );

    return NextResponse.json({
      id: updated.rows[0].id,
      vote_count: updated.rows[0].vote_count,
      voted_by_me: true,
    });
  } catch (e) {
    console.error('POST /api/college/feature-ideas/[id]/vote', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Feature Ideas tables missing — run npm run db:migrate:114' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
  }
}

export const POST = withApiHandlers(__platform_POST, { context: 'api_college_feature_ideas_vote' });
