/**
 * Optional LLM pass for skill tags (server-only). NVIDIA keys first, rotated on failure.
 */

import { fetchLlmChatCompletion, getLlmChatConfig, llmConfigurationHint } from '@/lib/llmChatConfig';

const MAX_RESUME_CHARS = 12000;

function parseSkillsJson(text) {
  const raw = String(text || '').trim();
  try {
    const parsed = JSON.parse(raw);
    const list = parsed?.skills ?? parsed?.tags ?? parsed;
    if (!Array.isArray(list)) return [];
    return list.map((s) => String(s || '').trim()).filter(Boolean);
  } catch {
    const m = raw.match(/\{[\s\S]*"skills"\s*:\s*\[[\s\S]*?\][\s\S]*\}/);
    if (!m) return [];
    try {
      const parsed = JSON.parse(m[0]);
      const list = parsed?.skills ?? [];
      return Array.isArray(list) ? list.map((s) => String(s || '').trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
}

/**
 * @param {string} resumeText
 * @param {string[]} existing
 * @returns {Promise<{
 *   skills: string[],
 *   error: string | null,
 *   httpStatus: number | null,
 *   provider: string | null,
 *   keysTried?: number,
 * }>}
 */
export async function suggestSkillsWithOpenAI(resumeText, existing = []) {
  const llm = getLlmChatConfig();
  if (!llm.configured) {
    return {
      skills: [],
      error: llmConfigurationHint(),
      httpStatus: null,
      provider: null,
    };
  }

  const hay = String(resumeText || '').trim();
  if (!hay) {
    return { skills: [], error: 'No résumé text to analyze.', httpStatus: null, provider: llm.provider };
  }

  const have = new Set(existing.map((s) => String(s).toLowerCase()));
  const clipped = hay.slice(0, MAX_RESUME_CHARS);

  const system = `You extract concise skill tags from a student résumé for a campus placement profile.
Return ONLY valid JSON: {"skills":["Skill one","Skill two"]} with 0 to 12 short tags (technologies, tools, domains, soft skills).
Do not duplicate skills the student already has. Do not invent credentials. No prose outside JSON.`;

  const userPayload = JSON.stringify({
    existing_skills: existing,
    resume_text: clipped,
  });

  const result = await fetchLlmChatCompletion({
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPayload },
    ],
  });

  if (!result.ok) {
    return {
      skills: [],
      error: result.error || 'LLM request failed.',
      httpStatus: result.status ?? null,
      provider: result.provider ?? null,
      keysTried: result.keysTried,
    };
  }

  const content = result.data?.choices?.[0]?.message?.content || '';
  const parsed = parseSkillsJson(content);
  const out = [];
  for (const skill of parsed) {
    const key = skill.toLowerCase();
    if (have.has(key)) continue;
    out.push(skill);
    have.add(key);
    if (out.length >= 12) break;
  }

  return {
    skills: out,
    error: null,
    httpStatus: result.status ?? null,
    provider: result.provider ?? null,
    keysTried: result.keysTried,
  };
}
