/**
 * Export help corpus to docs/help/*.md and extended chunk builders.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildHelpKnowledgeChunks } from './helpKnowledgeBuild.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');
export const HELP_DOCS_DIR = path.join(REPO_ROOT, 'docs', 'help');

/** Sources indexed for AI — excludes boilerplate screen FAQs. */
export const AI_HELP_SOURCES = new Set(['help', 'developer', 'markdown']);

/** @param {string} name */
function slugify(name) {
  return String(name || 'doc')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Split long articles into overlapping chunks (future-proof as docs grow).
 * @param {string} content
 * @param {{ maxChars?: number, overlap?: number }} [opts]
 */
export function splitContentIntoChunks(content, opts = {}) {
  const maxChars = opts.maxChars ?? 1800;
  const overlap = opts.overlap ?? 200;
  const text = String(content || '').trim();
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const parts = [];
  let buf = '';

  for (const para of paragraphs) {
    const next = buf ? `${buf}\n\n${para}` : para;
    if (next.length <= maxChars) {
      buf = next;
      continue;
    }
    if (buf) parts.push(buf);
    if (para.length <= maxChars) {
      buf = para;
      continue;
    }
    for (let i = 0; i < para.length; i += maxChars - overlap) {
      parts.push(para.slice(i, i + maxChars));
    }
    buf = '';
  }
  if (buf) parts.push(buf);
  return parts;
}

/**
 * @param {ReturnType<typeof buildHelpKnowledgeChunks>[number]} chunk
 * @param {number} partIndex
 * @param {number} partTotal
 */
function chunkKeyForPart(chunk, partIndex, partTotal) {
  if (partTotal <= 1) return chunk.chunkKey;
  return `${chunk.chunkKey}#p${partIndex + 1}`;
}

/**
 * Rich chunks for retrieval — splits long articles, skips FAQ noise.
 * @param {{ includeFaqs?: boolean }} [opts]
 */
export function buildAiHelpChunks(opts = {}) {
  const base = buildHelpKnowledgeChunks();
  /** @type {ReturnType<typeof buildHelpKnowledgeChunks>} */
  const out = [];

  for (const chunk of base) {
    const parts = splitContentIntoChunks(chunk.content);
    parts.forEach((part, i) => {
      out.push({
        ...chunk,
        chunkKey: chunkKeyForPart(chunk, i, parts.length),
        content: part,
        sortOrder: chunk.sortOrder * 100 + i,
      });
    });
  }

  if (opts.includeFaqs) return out;
  return out;
}

/**
 * Write markdown mirror under docs/help/ for Cursor / Codex / Claude Code.
 * @returns {string[]} written file paths (relative to repo root)
 */
export function exportHelpMarkdownFiles() {
  const chunks = buildHelpKnowledgeChunks();
  const written = [];

  if (fs.existsSync(HELP_DOCS_DIR)) {
    for (const dir of fs.readdirSync(HELP_DOCS_DIR, { withFileTypes: true })) {
      if (!dir.isDirectory() || dir.name.startsWith('.')) continue;
      const sectionDir = path.join(HELP_DOCS_DIR, dir.name);
      for (const file of fs.readdirSync(sectionDir)) {
        if (file.endsWith('.md')) fs.unlinkSync(path.join(sectionDir, file));
      }
    }
  }

  for (const chunk of chunks) {
    const sectionFolder = chunk.sectionId || chunk.source || 'general';
    const dir = path.join(HELP_DOCS_DIR, sectionFolder);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${slugify(chunk.itemId || chunk.itemTitle)}.md`;
    const rel = path.join('docs', 'help', sectionFolder, filename);
    const body = `# ${chunk.itemTitle}

> **Section:** ${chunk.sectionTitle || sectionFolder}  
> **Source:** ${chunk.source}  
> **Audience:** ${(chunk.audience || ['all']).join(', ')}

${chunk.content}
`;
    fs.writeFileSync(path.join(dir, filename), body, 'utf8');
    written.push(rel.replace(/\\/g, '/'));
  }

  return written;
}

/**
 * Load markdown files from docs/help (optional extra corpus).
 * @returns {ReturnType<typeof buildHelpKnowledgeChunks>}
 */
export function loadMarkdownHelpChunks() {
  if (!fs.existsSync(HELP_DOCS_DIR)) return [];

  /** @type {ReturnType<typeof buildHelpKnowledgeChunks>} */
  const out = [];
  let order = 5000;

  const walk = (dir, sectionFolder) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, ent.name);
        continue;
      }
      if (!ent.name.endsWith('.md') || ent.name === 'README.md') continue;
      const raw = fs.readFileSync(full, 'utf8');
      const titleMatch = raw.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]?.trim() || ent.name.replace(/\.md$/, '');
      const content = raw.replace(/^#.+$/m, '').replace(/^>.*$/gm, '').trim();
      if (!content) continue;
      const itemId = ent.name.replace(/\.md$/, '');
      out.push({
        chunkKey: `markdown:${sectionFolder}:${itemId}`,
        source: 'markdown',
        sectionId: sectionFolder,
        itemId,
        sectionTitle: sectionFolder.replace(/-/g, ' '),
        itemTitle: title,
        content,
        audience: ['all'],
        sortOrder: order++,
      });
    }
  };

  for (const ent of fs.readdirSync(HELP_DOCS_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    walk(path.join(HELP_DOCS_DIR, ent.name), ent.name);
  }

  return out;
}

/**
 * Full corpus for AI answers (~16k chars today — fits whole folder in context like Cursor).
 * @param {{ includeFaqs?: boolean }} [opts]
 */
export function buildFullAiCorpus(opts = {}) {
  const merged = [...buildAiHelpChunks({ includeFaqs: false }), ...loadMarkdownHelpChunks()];
  const seen = new Set();
  return merged.filter((c) => {
    if (seen.has(c.chunkKey)) return false;
    seen.add(c.chunkKey);
    return AI_HELP_SOURCES.has(c.source);
  });
}

/**
 * @param {Array<{ sectionTitle: string | null, itemTitle: string, content: string, source?: string, itemId?: string | null }>} chunks
 */
export function formatCorpusForPrompt(chunks) {
  return chunks
    .map((c, i) => {
      const header = `[${i + 1}] ${c.itemTitle}${c.sectionTitle ? ` — ${c.sectionTitle}` : ''}`;
      return `${header}\n${String(c.content || '').trim()}`;
    })
    .join('\n\n---\n\n');
}
