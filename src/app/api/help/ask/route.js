import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  generateHelpAnswer,
  helpSourcesFromChunks,
  loadFullHelpCorpus,
  retrieveHelpChunks,
} from '@/lib/helpRag';
import { isLlmChatConfigured } from '@/lib/llmChatConfig';
import { jsonPublicErrorLogged } from '@/lib/publicApiError';

/**
 * POST { question, screenTag?, roleHint?, docBasePath? }
 * Full-corpus RAG — same accuracy model as pointing Cursor at docs/help.
 */
async function __platform_POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = String(body.question || body.q || '').trim();
    const screenTag = String(body.screenTag || body.screen || '').trim() || null;
    const roleHint = String(body.roleHint || body.role || '').trim() || null;
    const docBasePath = String(body.docBasePath || '/dashboard/help').trim() || '/dashboard/help';

    if (!question || question.length < 2) {
      return NextResponse.json({ error: 'Question is required (min 2 characters).' }, { status: 400 });
    }

    const [fullCorpus, retrieval] = await Promise.all([
      loadFullHelpCorpus(),
      retrieveHelpChunks(question, { limit: 12, roleHint }),
    ]);

    const { answer, model } = await generateHelpAnswer(question, retrieval.chunks, fullCorpus);
    const sources = helpSourcesFromChunks(retrieval.chunks, docBasePath);

    let relatedFaqs = [];
    try {
      const pattern = `%${question.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      const faqRes = await query(
        `SELECT id, screen_tag, question, answer, sort_order
         FROM documentation_faq
         WHERE is_active = true
           AND (question ILIKE $1 ESCAPE '\\' OR answer ILIKE $1 ESCAPE '\\')
         ORDER BY
           CASE WHEN $2::text IS NOT NULL AND screen_tag = $2 THEN 0 ELSE 1 END,
           sort_order ASC
         LIMIT 5`,
        [pattern, screenTag],
      );
      relatedFaqs = faqRes.rows.filter(
        (r) => !/^What is the primary purpose of the/i.test(String(r.question || '')),
      ).slice(0, 3);
    } catch {
      /* optional */
    }

    return NextResponse.json({
      question,
      answer,
      sources,
      retrievalMode: retrieval.mode,
      corpusSize: fullCorpus.length,
      model,
      screenTag,
      relatedFaqs,
      ai: isLlmChatConfigured(),
      strategy: 'full_corpus_rag',
    });
  } catch (e) {
    return await jsonPublicErrorLogged(e, 'POST /api/help/ask', 'Failed to answer help question', 500, { request });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_help_ask' });
export const POST = __platformApiHandlers.POST;
