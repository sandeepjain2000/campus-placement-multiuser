import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { rankFaqIdsWithOpenAI } from '@/lib/helpFaqOpenai';
import { isLlmChatConfigured } from '@/lib/llmChatConfig';
import { jsonPublicErrorLogged } from '@/lib/publicApiError';

const GLOBAL_TAG = 'GLOBAL';

function normalizeScreenTag(raw) {
  const s = String(raw || '').trim();
  return s || GLOBAL_TAG;
}

function ilikePattern(q) {
  const t = String(q || '').trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${t}%`;
}

/**
 * GET ?screen=S-1 — suggested FAQs for this screen (+ GLOBAL), ordered.
 * GET ?screen=S-1&q=keyword — search: screen first, then GLOBAL, then any active row.
 */
/** Public read — used on /login and /help without a session. */
async function __platform_GET(request) {
  try {
    const url = new URL(request.url);
    const screenTag = normalizeScreenTag(url.searchParams.get('screen'));
    const q = String(url.searchParams.get('q') || '').trim();

    if (!q) {
      const res = await query(
        `SELECT id, screen_tag, question, answer, sort_order
         FROM documentation_faq
         WHERE is_active = true
           AND (screen_tag = $1 OR screen_tag = $2)
         ORDER BY
           CASE WHEN screen_tag = $1 THEN 0 ELSE 1 END,
           sort_order ASC,
           question ASC
         LIMIT 24`,
        [screenTag, GLOBAL_TAG]
      );
      return NextResponse.json({ screenTag, suggestions: res.rows });
    }

    const pattern = ilikePattern(q);

    const screenFirst = await query(
      `SELECT id, screen_tag, question, answer, sort_order, 1 AS rank_group
       FROM documentation_faq
       WHERE is_active = true
         AND screen_tag = $1
         AND (question ILIKE $2 ESCAPE '\\' OR answer ILIKE $2 ESCAPE '\\')
       ORDER BY sort_order ASC, question ASC
       LIMIT 10`,
      [screenTag, pattern]
    );
    if (screenFirst.rows.length > 0) {
      return NextResponse.json({ screenTag, query: q, matches: screenFirst.rows, scope: 'screen' });
    }

    const globalRows = await query(
      `SELECT id, screen_tag, question, answer, sort_order, 2 AS rank_group
       FROM documentation_faq
       WHERE is_active = true
         AND screen_tag = $1
         AND (question ILIKE $2 ESCAPE '\\' OR answer ILIKE $2 ESCAPE '\\')
       ORDER BY sort_order ASC, question ASC
       LIMIT 10`,
      [GLOBAL_TAG, pattern]
    );
    if (globalRows.rows.length > 0) {
      return NextResponse.json({ screenTag, query: q, matches: globalRows.rows, scope: 'global' });
    }

    const anyRows = await query(
      `SELECT id, screen_tag, question, answer, sort_order, 3 AS rank_group
       FROM documentation_faq
       WHERE is_active = true
         AND screen_tag NOT IN ($1, $2)
         AND (question ILIKE $3 ESCAPE '\\' OR answer ILIKE $3 ESCAPE '\\')
       ORDER BY sort_order ASC, question ASC
       LIMIT 10`,
      [screenTag, GLOBAL_TAG, pattern]
    );
    if (anyRows.rows.length > 0) {
      return NextResponse.json({ screenTag, query: q, matches: anyRows.rows, scope: 'any' });
    }

    const hasOpenAiKey = isLlmChatConfigured();

    if (hasOpenAiKey) {
      const pool = await query(
        `SELECT id, screen_tag, question, answer, sort_order
         FROM documentation_faq
         WHERE is_active = true
         ORDER BY
           CASE
             WHEN screen_tag = $1 THEN 0
             WHEN screen_tag = $2 THEN 1
             ELSE 2
           END,
           sort_order ASC,
           question ASC
         LIMIT 48`,
        [screenTag, GLOBAL_TAG]
      );
      const ranked = await rankFaqIdsWithOpenAI(q, pool.rows);
      const rankedIds = ranked.ids;
      if (rankedIds.length > 0) {
        const byId = new Map(pool.rows.map((r) => [String(r.id).trim().toLowerCase(), r]));
        const matches = rankedIds
          .map((id) => byId.get(String(id).trim().toLowerCase()))
          .filter(Boolean)
          .map((r) => ({ ...r, rank_group: 4 }));
        return NextResponse.json({
          screenTag,
          query: q,
          matches,
          scope: 'ai',
          ai: true,
        });
      }

      return NextResponse.json({
        screenTag,
        query: q,
        matches: [],
        scope: 'none',
      });
    }

    return NextResponse.json({
      screenTag,
      query: q,
      matches: [],
      scope: 'none',
    });
  } catch (e) {
    if (e.message && e.message.includes('documentation_faq')) {
      return await jsonPublicErrorLogged(
        e,
        'GET /api/help/faq (documentation_faq missing)',
        'Help content is not available right now.',
        503,
        { request },
      );
    }
    return await jsonPublicErrorLogged(e, 'GET /api/help/faq', 'Failed to load help', 500, { request });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_help_faq' });
export const GET = __platformApiHandlers.GET;
