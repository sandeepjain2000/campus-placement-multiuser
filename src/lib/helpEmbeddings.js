/**
 * OpenAI embeddings for help RAG (server-only).
 */

const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

/**
 * @param {number[]} a
 * @param {number[]} b
 */
export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * @param {string | string[]} input
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  const texts = (Array.isArray(input) ? input : [input]).map((t) => String(t || '').slice(0, 8000));
  if (!apiKey || !texts.length || !texts.some((t) => t.trim())) return [];

  const model = process.env.OPENAI_HELP_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('OpenAI embeddings:', res.status, errText.slice(0, 500));
    return [];
  }

  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.data) ? data.data : [];
  rows.sort((x, y) => (x.index ?? 0) - (y.index ?? 0));
  return rows.map((row) => row.embedding).filter(Array.isArray);
}

/**
 * @param {string} text
 * @returns {Promise<number[] | null>}
 */
export async function embedText(text) {
  const [vec] = await embedTexts([text]);
  return vec || null;
}
