/**
 * Build searchable help chunks from in-app documentation sources.
 * Used by sync script and as runtime fallback when DB is empty.
 */

import { HELP_SECTIONS } from '../content/helpDocumentation.js';
import {
  RUNNER_CHANGE_ALERTS,
  EMAIL_DEMO_NOTES,
  CLEANUP_OVERVIEW,
  CLEANUP_COMMANDS,
  RESTORE_AFTER_CLEANUP,
  DEMO_LOGINS,
  DEMO_PASSWORD,
} from '../content/developerNotes.js';

/** @param {string} sectionId */
function audienceForSection(sectionId) {
  switch (sectionId) {
    case 'students':
      return ['student'];
    case 'employers':
      return ['employer'];
    case 'college-admins':
      return ['college'];
    case 'super-admin':
      return ['super_admin'];
    default:
      return ['all'];
  }
}

/**
 * @returns {Array<{
 *   chunkKey: string,
 *   source: string,
 *   sectionId: string | null,
 *   itemId: string | null,
 *   sectionTitle: string | null,
 *   itemTitle: string,
 *   content: string,
 *   audience: string[],
 *   sortOrder: number,
 * }>}
 */
export function buildHelpKnowledgeChunks() {
  /** @type {ReturnType<typeof buildHelpKnowledgeChunks>} */
  const out = [];
  let order = 0;

  for (const section of HELP_SECTIONS) {
    const audience = audienceForSection(section.id);
    for (const item of section.items || []) {
      const content = String(item.content || '').trim();
      if (!content) continue;
      out.push({
        chunkKey: `help:${section.id}:${item.id}`,
        source: 'help',
        sectionId: section.id,
        itemId: item.id,
        sectionTitle: section.title,
        itemTitle: item.title,
        content,
        audience,
        sortOrder: order++,
      });
    }
  }

  for (const block of RUNNER_CHANGE_ALERTS) {
    const lines = [
      block.title ? `${block.date} — ${block.title}` : block.date,
      ...(block.items || []),
    ].filter(Boolean);
    out.push({
      chunkKey: `developer:runner-alerts:${block.date}`,
      source: 'developer',
      sectionId: 'developer',
      itemId: `runner-alerts-${block.date}`,
      sectionTitle: 'Developer / QA',
      itemTitle: `Runner alerts (${block.date})`,
      content: lines.join('\n'),
      audience: ['all'],
      sortOrder: order++,
    });
  }

  if (EMAIL_DEMO_NOTES.length) {
    out.push({
      chunkKey: 'developer:email-demo',
      source: 'developer',
      sectionId: 'developer',
      itemId: 'email-demo',
      sectionTitle: 'Developer / QA',
      itemTitle: 'Email & demo mail',
      content: EMAIL_DEMO_NOTES.join('\n'),
      audience: ['all'],
      sortOrder: order++,
    });
  }

  if (CLEANUP_COMMANDS.length) {
    const cleanupLines = [
      CLEANUP_OVERVIEW,
      '',
      'Wipe & selective cleanup:',
      ...CLEANUP_COMMANDS.flatMap((row) => [
        `- ${row.title}`,
        `  Command: ${row.command}`,
        ...(row.alt ? [`  Alt: ${row.alt}`] : []),
        `  ${row.detail}`,
        `  When: ${row.when}`,
      ]),
      '',
      'Restore after cleanup:',
      ...RESTORE_AFTER_CLEANUP.flatMap((row) => [
        `- ${row.title}`,
        `  ${row.command}`,
        ...(row.alt ? [`  Alt: ${row.alt}`] : []),
        `  ${row.detail}`,
      ]),
    ];
    out.push({
      chunkKey: 'developer:cleanup',
      source: 'developer',
      sectionId: 'developer',
      itemId: 'cleanup',
      sectionTitle: 'Developer / QA',
      itemTitle: 'Clean up & restore test data',
      content: cleanupLines.join('\n'),
      audience: ['all'],
      sortOrder: order++,
    });
  }

  const loginLines = DEMO_LOGINS.map((row) => `${row.role}: ${row.email}`).join('\n');
  out.push({
    chunkKey: 'developer:demo-logins',
    source: 'developer',
    sectionId: 'developer',
    itemId: 'demo-logins',
    sectionTitle: 'Developer / QA',
    itemTitle: 'Demo logins',
    content: `Password for all demo accounts: ${DEMO_PASSWORD}\n${loginLines}`,
    audience: ['all'],
    sortOrder: order++,
  });

  return out;
}

/**
 * @param {Array<{ chunkKey: string, itemTitle: string, sectionTitle: string | null, content: string, itemId: string | null }>} chunks
 * @param {string} question
 */
export function scoreChunksByKeywords(chunks, question) {
  const terms = String(question || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (!terms.length) return [];

  return chunks
    .map((chunk) => {
      const hay = `${chunk.itemTitle} ${chunk.sectionTitle || ''} ${chunk.content}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (hay.includes(term)) score += term.length >= 5 ? 3 : 2;
      }
      return { chunk, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
}
