/**
 * When keyword search finds nothing, rank FAQs with OpenAI (server-only).
 * Uses OPENAI_API_KEY; optional OPENAI_HELP_MODEL (default gpt-4o-mini).
 */

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_FAQS_IN_PROMPT = 36;
const MAX_ANSWER_CHARS = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeFaqRowId(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (UUID_RE.test(s)) return s;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return String(n);
  return null;
}

function parseIdsFromContent(text) {
  const raw = String(text || '').trim();
  const collect = (ids) => {
    if (!Array.isArray(ids)) return [];
    const out = [];
    for (const item of ids) {
      const norm = normalizeFaqRowId(item);
      if (norm) out.push(norm);
    }
    return out;
  };
  try {
    const parsed = JSON.parse(raw);
    const ids = parsed?.ids ?? parsed?.faq_ids;
    return collect(ids);
  } catch {
    const m = raw.match(/\{[\s\S]*"ids"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        return collect(parsed?.ids);
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * @param {string} userQuestion
 * @param {Array<{ id: string, screen_tag: string, question: string, answer: string }>} faqRows
 * @returns {Promise<{ ids: string[], openaiHttpStatus: number | null }>}
 */
export async function rankFaqIdsWithOpenAI(userQuestion, faqRows) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !faqRows.length) return { ids: [], openaiHttpStatus: null };

  const trimmed = faqRows.slice(0, MAX_FAQS_IN_PROMPT).map((r) => ({
    id: r.id,
    screen_tag: r.screen_tag,
    question: r.question,
    answer: String(r.answer ?? '').slice(0, MAX_ANSWER_CHARS),
  }));

  const model = process.env.OPENAI_HELP_MODEL || DEFAULT_MODEL;

  const system = `You match a user's in-app help question to existing FAQ entries.
You will receive a JSON array of objects with keys: id, screen_tag, question, answer.
Each "id" is a UUID string (e.g. 8c4b2f1a-....). Return ONLY valid JSON: {"ids":[...]} — an array of 0 to 5 "id" strings copied exactly from that list, ordered by relevance (best first).
If the user's question is unrelated to every FAQ, return {"ids":[]}.
Do not invent ids. Do not add prose outside the JSON.`;

  const userPayload = JSON.stringify({
    user_question: userQuestion,
    faqs: trimmed,
  });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPayload },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('OpenAI help FAQ:', res.status, errText.slice(0, 500));
    return { ids: [], openaiHttpStatus: res.status };
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const ids = parseIdsFromContent(content);
  const allowed = new Set(
    trimmed.map((r) => normalizeFaqRowId(r.id)).filter(Boolean),
  );
  const filtered = ids.filter((id) => allowed.has(id));
  return { ids: filtered, openaiHttpStatus: null };
}
