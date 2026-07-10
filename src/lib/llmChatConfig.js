/**
 * OpenAI-compatible chat LLM (server-only).
 * Order: every NVIDIA key (env → key file → keys dir), then OpenAI fallback.
 * On auth/rate-limit errors, rotates to the next key automatically.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

const NVIDIA_BASE_URL_DEFAULT = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL_DEFAULT = 'meta/llama-3.1-8b-instruct';
const OPENAI_MODEL_DEFAULT = 'gpt-4o-mini';

function loadKeyFromJsonFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const key = String(data?.api_key || data?.NVIDIA_API_KEY || '').trim();
  if (!key) throw new Error(`No api_key in ${filePath}`);
  return key;
}

/**
 * @returns {Array<{ apiKey: string, label: string }>}
 */
function discoverNvidiaKeyRing() {
  const ring = [];
  const seen = new Set();

  const push = (apiKey, label) => {
    const k = String(apiKey || '').trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    ring.push({ apiKey: k, label });
  };

  const envKey = String(process.env.NVIDIA_API_KEY || '').trim();
  if (envKey) push(envKey, 'env:NVIDIA_API_KEY');

  for (let i = 2; i <= 32; i += 1) {
    const numbered = String(process.env[`NVIDIA_API_KEY_${i}`] || '').trim();
    if (numbered) push(numbered, `env:NVIDIA_API_KEY_${i}`);
  }

  const keyFile = String(process.env.NVIDIA_KEY_FILE || '').trim();
  if (keyFile) {
    const resolved = path.resolve(keyFile);
    if (existsSync(resolved)) {
      try {
        push(loadKeyFromJsonFile(resolved), path.basename(resolved));
      } catch (e) {
        console.warn('[llmChatConfig] NVIDIA_KEY_FILE:', e?.message || e);
      }
    }
  }

  const keysDir = String(process.env.NVIDIA_KEYS_DIR || '').trim();
  if (keysDir) {
    const dir = path.resolve(keysDir);
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir)
          .filter((name) => name.toLowerCase().endsWith('.json'))
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        for (const name of files) {
          try {
            push(loadKeyFromJsonFile(path.join(dir, name)), name);
          } catch (e) {
            console.warn('[llmChatConfig] skip key file %s: %s', name, e?.message || e);
          }
        }
      } catch (e) {
        console.warn('[llmChatConfig] NVIDIA_KEYS_DIR:', e?.message || e);
      }
    }
  }

  return ring;
}

/**
 * @returns {Array<{
 *   provider: 'nvidia' | 'openai',
 *   apiKey: string,
 *   baseUrl: string,
 *   model: string,
 *   label: string,
 * }>}
 */
export function buildLlmAttemptChain() {
  const chain = [];
  const nvidiaBaseUrl = String(process.env.NVIDIA_API_BASE_URL || NVIDIA_BASE_URL_DEFAULT).replace(/\/$/, '');
  const nvidiaModel = String(
    process.env.NVIDIA_CHAT_MODEL || process.env.OPENAI_HELP_MODEL || NVIDIA_MODEL_DEFAULT,
  ).trim();

  for (const { apiKey, label } of discoverNvidiaKeyRing()) {
    chain.push({
      provider: 'nvidia',
      apiKey,
      baseUrl: nvidiaBaseUrl,
      model: nvidiaModel,
      label: `NVIDIA NIM (${label})`,
    });
  }

  const openaiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (openaiKey) {
    chain.push({
      provider: 'openai',
      apiKey: openaiKey,
      baseUrl: 'https://api.openai.com/v1',
      model: String(process.env.OPENAI_HELP_MODEL || OPENAI_MODEL_DEFAULT).trim(),
      label: 'OpenAI',
    });
  }

  return chain;
}

/** @param {number} status @param {string} errText */
export function isRotatableLlmError(status, errText = '') {
  const msg = `${status} ${errText}`.toLowerCase();
  if ([401, 403, 429, 500, 502, 503, 504].includes(Number(status))) return true;
  const hints = [
    'rate',
    'quota',
    'limit',
    'too many requests',
    'unauthorized',
    'forbidden',
    'invalid api',
    'api key',
    'credit',
    'exhausted',
    'capacity',
  ];
  return hints.some((h) => msg.includes(h));
}

function isRotatableNetworkError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('econnreset')
    || msg.includes('etimedout')
    || msg.includes('fetch failed')
    || msg.includes('network')
    || msg.includes('socket')
  );
}

/**
 * First provider in the chain (backward compatible).
 */
export function getLlmChatConfig() {
  const chain = buildLlmAttemptChain();
  if (!chain.length) {
    return {
      configured: false,
      provider: null,
      apiKey: '',
      baseUrl: '',
      model: '',
      label: 'not configured',
      keyCount: 0,
    };
  }
  const first = chain[0];
  return {
    configured: true,
    provider: first.provider,
    apiKey: first.apiKey,
    baseUrl: first.baseUrl,
    model: first.model,
    label: first.label,
    keyCount: chain.length,
    nvidiaKeyCount: chain.filter((a) => a.provider === 'nvidia').length,
  };
}

export function isLlmChatConfigured() {
  return buildLlmAttemptChain().length > 0;
}

/** User-facing copy when LLM / smart AI is not configured (never expose env var names). */
export const LLM_UNAVAILABLE_USER_MESSAGE =
  'Smart AI features are not available on this site yet.';

export function llmConfigurationHint() {
  return LLM_UNAVAILABLE_USER_MESSAGE;
}

/**
 * Chat completion with NVIDIA key rotation, then OpenAI fallback.
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   temperature?: number,
 *   max_tokens?: number,
 *   response_format?: { type: string },
 * }} opts
 * @returns {Promise<{
 *   ok: boolean,
 *   data?: object,
 *   status?: number,
 *   error?: string,
 *   provider?: string | null,
 *   label?: string,
 *   keysTried?: number,
 * }>}
 */
export async function fetchLlmChatCompletion(opts) {
  const chain = buildLlmAttemptChain();
  if (!chain.length) {
    return { ok: false, error: llmConfigurationHint(), provider: null, keysTried: 0 };
  }

  const errors = [];

  for (let i = 0; i < chain.length; i += 1) {
    const attempt = chain[i];
    const url = `${attempt.baseUrl}/chat/completions`;
    const body = {
      model: attempt.model,
      temperature: opts.temperature ?? 0.2,
      messages: opts.messages,
    };
    if (opts.max_tokens != null) body.max_tokens = opts.max_tokens;
    if (opts.response_format && attempt.provider === 'openai') {
      body.response_format = opts.response_format;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${attempt.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        return {
          ok: true,
          data,
          status: res.status,
          provider: attempt.provider,
          label: attempt.label,
          keysTried: i + 1,
        };
      }

      const errText = await res.text().catch(() => '');
      errors.push(`${attempt.label}: HTTP ${res.status}`);
      console.warn(`[llmChat] ${attempt.label} failed (${res.status}):`, errText.slice(0, 300));

      if (i < chain.length - 1) {
        console.warn(`[llmChat] Rotating to next key (${i + 2}/${chain.length})…`);
        continue;
      }

      return {
        ok: false,
        status: res.status,
        error: `${attempt.label} failed (${res.status}). All keys exhausted.`,
        provider: attempt.provider,
        label: attempt.label,
        keysTried: i + 1,
        allErrors: errors,
      };
    } catch (e) {
      errors.push(`${attempt.label}: ${e?.message || e}`);
      console.warn(`[llmChat] ${attempt.label} network error:`, e?.message || e);
      if (i < chain.length - 1) {
        console.warn(`[llmChat] Rotating to next key (${i + 2}/${chain.length})…`);
        continue;
      }
      return {
        ok: false,
        error: e?.message || 'LLM request failed (network).',
        provider: attempt.provider,
        label: attempt.label,
        keysTried: i + 1,
        allErrors: errors,
      };
    }
  }

  return {
    ok: false,
    error: `All ${chain.length} API key(s) failed. ${errors.join('; ')}`,
    provider: null,
    keysTried: chain.length,
    allErrors: errors,
  };
}
