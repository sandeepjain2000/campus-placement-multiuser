import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/sessionUser';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  FEATURE_IDEA_STATUSES,
  FEATURE_IDEA_TOPICS,
  MAX_FEATURE_IDEA_DESCRIPTION,
  MAX_FEATURE_IDEA_TITLE,
  normalizeFeatureIdeaTopics,
} from '@/lib/featureIdeas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireCollege(session) {
  return session?.user?.role === 'college_admin';
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId || !requireCollege(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = String(url.searchParams.get('status') || '').trim();
    const topic = String(url.searchParams.get('topic') || '').trim();
    const sort = String(url.searchParams.get('sort') || 'trending').trim();
    const q = String(url.searchParams.get('q') || '').trim();

    const params = [userId];
    const where = ['TRUE'];

    if (status && FEATURE_IDEA_STATUSES.includes(status)) {
      params.push(status);
      where.push(`fi.status = $${params.length}`);
    }
    if (topic && FEATURE_IDEA_TOPICS.includes(topic)) {
      params.push(topic);
      where.push(`$${params.length} = ANY(fi.topics)`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(fi.title ILIKE $${params.length} OR fi.description ILIKE $${params.length})`);
    }

    const orderBy =
      sort === 'newest'
        ? 'fi.created_at DESC'
        : 'fi.vote_count DESC, fi.created_at DESC';

    const res = await query(
      `SELECT
         fi.id,
         fi.title,
         fi.description,
         fi.status,
         fi.topics,
         fi.vote_count,
         fi.created_at,
         fi.updated_at,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS author_name,
         t.name AS college_name,
         EXISTS (
           SELECT 1 FROM feature_idea_votes v
           WHERE v.idea_id = fi.id AND v.user_id = $1::uuid
         ) AS voted_by_me
       FROM feature_ideas fi
       LEFT JOIN users u ON u.id = fi.author_user_id
       LEFT JOIN tenants t ON t.id = fi.tenant_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT 100`,
      params,
    );

    const counts = await query(
      `SELECT status, COUNT(*)::int AS n
       FROM feature_ideas
       GROUP BY status`,
    );
    const topicCounts = await query(
      `SELECT unnest(topics) AS topic, COUNT(*)::int AS n
       FROM feature_ideas
       GROUP BY 1`,
    );

    const statusCounts = Object.fromEntries(FEATURE_IDEA_STATUSES.map((s) => [s, 0]));
    for (const row of counts.rows) {
      if (Object.prototype.hasOwnProperty.call(statusCounts, row.status)) {
        statusCounts[row.status] = row.n;
      }
    }
    const topicCountMap = Object.fromEntries(FEATURE_IDEA_TOPICS.map((t) => [t, 0]));
    for (const row of topicCounts.rows) {
      if (Object.prototype.hasOwnProperty.call(topicCountMap, row.topic)) {
        topicCountMap[row.topic] = row.n;
      }
    }

    return NextResponse.json({
      items: res.rows,
      statusCounts,
      topicCounts: topicCountMap,
      statuses: FEATURE_IDEA_STATUSES,
      topics: FEATURE_IDEA_TOPICS,
    });
  } catch (e) {
    console.error('GET /api/college/feature-ideas', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Feature Ideas tables missing — run npm run db:migrate:114' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to load ideas' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId || !requireCollege(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const topics = normalizeFeatureIdeaTopics(body.topics);

    if (!title || title.length > MAX_FEATURE_IDEA_TITLE) {
      return NextResponse.json({ error: 'Title is required (max 200 characters)' }, { status: 400 });
    }
    if (!description || description.length > MAX_FEATURE_IDEA_DESCRIPTION) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!topics.length) {
      return NextResponse.json({ error: 'Choose at least one topic' }, { status: 400 });
    }

    const tenantId = session.user.tenantId || session.user.tenant_id || null;

    const inserted = await query(
      `INSERT INTO feature_ideas (author_user_id, tenant_id, title, description, topics, vote_count)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::text[], 1)
       RETURNING id, title, description, status, topics, vote_count, created_at`,
      [userId, tenantId, title, description, topics],
    );

    const idea = inserted.rows[0];
    await query(
      `INSERT INTO feature_idea_votes (idea_id, user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      [idea.id, userId],
    );

    return NextResponse.json({ idea }, { status: 201 });
  } catch (e) {
    console.error('POST /api/college/feature-ideas', e);
    if (e.code === '42P01') {
      return NextResponse.json(
        { error: 'Feature Ideas tables missing — run npm run db:migrate:114' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to submit idea' }, { status: 500 });
  }
}

export const GET = withApiHandlers(__platform_GET, { context: 'api_college_feature_ideas' });
export const POST = withApiHandlers(__platform_POST, { context: 'api_college_feature_ideas' });
