/**
 * Hybrid retrieval + full-corpus grounded answers (Cursor-style: whole help folder in context).
 */

import { query } from '@/lib/db';
import { scoreChunksByKeywords } from '@/lib/helpKnowledgeBuild';
import {
  AI_HELP_SOURCES,
  buildFullAiCorpus,
  formatCorpusForPrompt,
} from '@/lib/helpKnowledgeExport';
import { cosineSimilarity, embedText } from '@/lib/helpEmbeddings';
import { fetchLlmChatCompletion, isLlmChatConfigured } from '@/lib/llmChatConfig';

const DEFAULT_CHAT_MODEL = 'gpt-4o';
const FALLBACK_CHAT_MODEL = 'gpt-4o-mini';
const MAX_RETRIEVED = 12;
const SOURCE_WEIGHT = { help: 1.35, developer: 1.2, markdown: 1.15, faq: 0.15 };

/**
 * @param {unknown} value
 * @returns {number[] | null}
 */
function parseEmbedding(value) {
  if (Array.isArray(value)) return value.every((n) => typeof n === 'number') ? value : null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} row
 */
function mapDbChunk(row) {
  return {
    chunkKey: row.chunk_key,
    source: row.source,
    sectionId: row.section_id,
    itemId: row.item_id,
    sectionTitle: row.section_title,
    itemTitle: row.item_title,
    content: row.content,
    audience: Array.isArray(row.audience) ? row.audience : ['all'],
    embedding: parseEmbedding(row.embedding),
    ftsRank: typeof row.rank === 'number' ? row.rank : Number(row.rank) || 0,
  };
}

function sourceWeight(source) {
  return SOURCE_WEIGHT[String(source || '').toLowerCase()] ?? 0.5;
}

/**
 * @param {Array<{ score?: number, source?: string, audience?: string[], itemId?: string | null }>} chunks
 * @param {string | null | undefined} roleHint
 */
function finalizeScores(chunks, roleHint) {
  const role = roleHint ? String(roleHint).toLowerCase() : null;
  const byItem = new Map();

  for (const c of chunks) {
    let score = (c.score ?? 0) * sourceWeight(c.source);
    if (role) {
      if (c.audience?.includes(role)) score += 0.35;
      else if (c.audience?.includes('all')) score += 0.08;
    }
    const key = c.itemId || c.chunkKey;
    const prev = byItem.get(key);
    if (!prev || score > (prev.score ?? 0)) {
      byItem.set(key, { ...c, score });
    }
  }

  return [...byItem.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * Load entire help library from DB or in-memory export (mirrors docs/help folder).
 */
export async function loadFullHelpCorpus() {
  try {
    const res = await query(
      `SELECT chunk_key, source, section_id, item_id, section_title, item_title, content, audience, sort_order
       FROM documentation_help_chunks
       WHERE is_active = true
         AND source = ANY($1::text[])
       ORDER BY sort_order ASC, item_title ASC`,
      [[...AI_HELP_SOURCES]],
    );
    if (res.rows.length) {
      return res.rows.map((row) => ({
        chunkKey: row.chunk_key,
        source: row.source,
        sectionId: row.section_id,
        itemId: row.item_id,
        sectionTitle: row.section_title,
        itemTitle: row.item_title,
        content: row.content,
        audience: row.audience,
      }));
    }
  } catch (e) {
    if (!String(e.message || '').includes('documentation_help_chunks')) throw e;
  }

  return buildFullAiCorpus().map((c) => ({
    chunkKey: c.chunkKey,
    source: c.source,
    sectionId: c.sectionId,
    itemId: c.itemId,
    sectionTitle: c.sectionTitle,
    itemTitle: c.itemTitle,
    content: c.content,
    audience: c.audience,
  }));
}

/**
 * @param {string} question
 * @param {{ limit?: number, roleHint?: string | null }} [opts]
 */
export async function retrieveHelpChunks(question, opts = {}) {
  const limit = opts.limit ?? MAX_RETRIEVED;
  const q = String(question || '').trim();
  if (!q) return { chunks: [], mode: 'none' };

  const sources = [...AI_HELP_SOURCES];
  /** @type {Array<ReturnType<typeof mapDbChunk> & { score?: number }>} */
  const byKey = new Map();

  try {
    const fts = await query(
      `SELECT chunk_key, source, section_id, item_id, section_title, item_title, content, audience, embedding,
              ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
       FROM documentation_help_chunks
       WHERE is_active = true
         AND source = ANY($2::text[])
         AND search_vector @@ websearch_to_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT 24`,
      [q, sources],
    );
    for (const row of fts.rows) {
      const chunk = mapDbChunk(row);
      byKey.set(chunk.chunkKey, { ...chunk, score: chunk.ftsRank * 2 });
    }
  } catch (e) {
    if (!String(e.message || '').includes('documentation_help_chunks')) throw e;
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const pool = await query(
        `SELECT chunk_key, source, section_id, item_id, section_title, item_title, content, audience, embedding
         FROM documentation_help_chunks
         WHERE is_active = true AND source = ANY($1::text[]) AND embedding IS NOT NULL`,
        [sources],
      );
      const queryVec = await embedText(q);
      if (queryVec?.length) {
        for (const row of pool.rows) {
          const chunk = mapDbChunk(row);
          const sim = cosineSimilarity(queryVec, chunk.embedding);
          if (sim < 0.12) continue;
          const prev = byKey.get(chunk.chunkKey);
          byKey.set(chunk.chunkKey, {
            ...chunk,
            score: (prev?.score ?? 0) + sim * 3.5,
          });
        }
      }
    } catch (e) {
      if (!String(e.message || '').includes('documentation_help_chunks')) throw e;
    }
  }

  let merged = [...byKey.values()];

  if (!merged.length) {
    const memory = buildFullAiCorpus().map((c) => ({
      chunkKey: c.chunkKey,
      source: c.source,
      sectionId: c.sectionId,
      itemId: c.itemId,
      sectionTitle: c.sectionTitle,
      itemTitle: c.itemTitle,
      content: c.content,
      audience: c.audience,
      embedding: null,
      ftsRank: 0,
    }));
    merged = scoreChunksByKeywords(memory, q).map(({ chunk, score }) => ({ ...chunk, score: score * 1.5 }));
    if (!merged.length) {
      return { chunks: memory.slice(0, limit), mode: 'memory_fallback' };
    }
    return {
      chunks: finalizeScores(merged, opts.roleHint).slice(0, limit),
      mode: 'memory_keywords',
    };
  }

  const mode = merged.some((c) => c.embedding) ? 'hybrid' : 'fts';
  return {
    chunks: finalizeScores(merged, opts.roleHint).slice(0, limit),
    mode,
  };
}

/**
 * @param {string} question
 * @param {Array<{ itemTitle: string, sectionTitle: string | null, content: string, itemId?: string | null, source?: string }>} retrieved
 * @param {Array<{ itemTitle: string, sectionTitle: string | null, content: string }>} fullCorpus
 */
export async function generateHelpAnswer(question, retrieved, fullCorpus) {
  const corpus = fullCorpus?.length ? fullCorpus : retrieved;
  const corpusText = formatCorpusForPrompt(corpus);
  const focusText = formatCorpusForPrompt(retrieved || []);

  if (!corpusText.trim()) {
    return {
      answer:
        'Help library is empty. Run npm run qa:sync-help-knowledge, or open full help documentation.',
      model: null,
    };
  }

  if (!isLlmChatConfigured()) {
    const top = retrieved?.[0] || corpus[0];
    return {
      answer: String(top?.content || '').slice(0, 2400),
      model: 'excerpt_fallback',
    };
  }

  const model = process.env.OPENAI_HELP_MODEL || DEFAULT_CHAT_MODEL;

  const system = `You are PlacementHub's in-app help assistant — same role as when a developer points Cursor or Claude Code at the docs/help folder.

Rules:
1. Answer ONLY from COMPLETE DOCUMENTATION below (the full help library). Do not invent menus, URLs, or policies.
2. Use exact screen and menu names from the docs (e.g. "Assessment uploads (CSV)", "Assessment Update Online", "Hiring Results Dashboard").
3. For how-to questions, give clear numbered steps when the docs support it.
4. If the documentation does not cover the question, say so plainly and suggest opening full help documentation.
5. Be direct and accurate — prefer completeness over brevity when steps matter.
6. Plain text only (no markdown # headings).`;

  const userContent = `COMPLETE DOCUMENTATION (docs/help — ${corpus.length} articles):
${corpusText}

---
MOST RELEVANT EXCERPTS (retrieval focus):
${focusText || '(same as above)'}

---
USER QUESTION:
${question}`;

  let result = await fetchLlmChatCompletion({
    temperature: 0.1,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
  });

  if (!result.ok) {
    console.error('LLM help answer:', result.status, result.error);
    const top = retrieved?.[0] || corpus[0];
    return {
      answer: String(top?.content || '').slice(0, 2400),
      model: 'excerpt_fallback',
    };
  }

  const answer = String(result.data?.choices?.[0]?.message?.content || '').trim();
  const usedModel = result.data?.model || result.label || model;

  return {
    answer: answer || String(corpus[0]?.content || '').slice(0, 2400),
    model: usedModel,
  };
}

/**
 * @param {Array<{ itemId: string | null, itemTitle: string, sectionTitle: string | null, chunkKey: string, source?: string }>} chunks
 * @param {string} docBasePath
 */
export function helpSourcesFromChunks(chunks, docBasePath = '/dashboard/help') {
  const base = docBasePath.replace(/\/$/, '');
  return (chunks || []).map((c) => ({
    chunkKey: c.chunkKey,
    title: c.itemTitle,
    section: c.sectionTitle,
    href:
      c.itemId && (c.source === 'help' || c.source === 'markdown')
        ? `${base}#${c.itemId}`
        : base,
  }));
}
