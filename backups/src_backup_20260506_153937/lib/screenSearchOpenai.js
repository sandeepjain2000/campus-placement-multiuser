/**
 * Map natural language to dashboard paths using OpenAI (optional).
 * Uses OPENAI_API_KEY; optional OPENAI_HELP_MODEL (default gpt-4o-mini).
 */

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * @param {string} userQuery
 * @param {Array<{ href: string; label: string; section: string }>} screens
 * @returns {Promise<{ hrefs: string[]; openaiHttpStatus: number | null }>}
 */
export async function matchScreensWithOpenAI(userQuery, screens) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !screens.length || !String(userQuery || '').trim()) {
    return { hrefs: [], openaiHttpStatus: null };
  }

  const model = process.env.OPENAI_HELP_MODEL || DEFAULT_MODEL;
  const compact = screens.slice(0, 80).map((s) => ({
    href: s.href,
    label: s.label,
    section: s.section,
  }));

  const system = `You help users navigate a web app. You receive a JSON object with "screens": an array of {href, label, section}.
The user describes what they want to do or which page they need. Return ONLY valid JSON: {"hrefs":["..."]} — up to 8 "href" strings copied EXACTLY from the screens list, best match first.
If nothing fits, return {"hrefs":[]}. Do not invent hrefs. No prose outside JSON.`;

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
        {
          role: 'user',
          content: JSON.stringify({ user_query: userQuery.trim(), screens: compact }),
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('OpenAI screen search:', res.status, errText.slice(0, 500));
    return { hrefs: [], openaiHttpStatus: res.status };
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw);
    const hrefs = Array.isArray(parsed?.hrefs) ? parsed.hrefs.map((h) => String(h).trim()).filter(Boolean) : [];
    const allowed = new Set(compact.map((s) => s.href));
    const out = hrefs.filter((h) => allowed.has(h)).slice(0, 8);
    return { hrefs: out, openaiHttpStatus: res.status };
  } catch {
    return { hrefs: [], openaiHttpStatus: res.status };
  }
}
