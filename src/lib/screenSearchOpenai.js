/**
 * Map natural language to dashboard paths using LLM (optional).
 * NVIDIA keys first (rotated), then OpenAI fallback.
 */

import { fetchLlmChatCompletion, isLlmChatConfigured } from '@/lib/llmChatConfig';

/**
 * @param {string} userQuery
 * @param {Array<{ href: string; label: string; section: string }>} screens
 * @returns {Promise<{ hrefs: string[]; openaiHttpStatus: number | null }>}
 */
export async function matchScreensWithOpenAI(userQuery, screens) {
  if (!isLlmChatConfigured() || !screens.length || !String(userQuery || '').trim()) {
    return { hrefs: [], openaiHttpStatus: null };
  }

  const compact = screens.slice(0, 80).map((s) => ({
    href: s.href,
    label: s.label,
    section: s.section,
  }));

  const system = `You help users navigate a web app. You receive a JSON object with "screens": an array of {href, label, section}.
The user describes what they want to do or which page they need. Return ONLY valid JSON: {"hrefs":["..."]} — up to 8 "href" strings copied EXACTLY from the screens list, best match first.
If nothing fits, return {"hrefs":[]}. Do not invent hrefs. No prose outside JSON.`;

  const result = await fetchLlmChatCompletion({
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: JSON.stringify({ user_query: userQuery.trim(), screens: compact }),
      },
    ],
  });

  if (!result.ok) {
    console.error('LLM screen search:', result.status, result.error);
    return { hrefs: [], openaiHttpStatus: result.status ?? null };
  }

  const raw = result.data?.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw);
    const hrefs = Array.isArray(parsed?.hrefs) ? parsed.hrefs.map((h) => String(h).trim()).filter(Boolean) : [];
    const allowed = new Set(compact.map((s) => s.href));
    const out = hrefs.filter((h) => allowed.has(h)).slice(0, 8);
    return { hrefs: out, openaiHttpStatus: result.status ?? null };
  } catch {
    return { hrefs: [], openaiHttpStatus: result.status ?? null };
  }
}
