import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function getDbConfig() {
  const env = readEnvLocal();
  const rawUrl =
    process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL is required (.env.local supported).');
  return { connectionString: rawUrl, ssl: { rejectUnauthorized: false } };
}

function hashContent(text) {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

async function embedBatch(texts) {
  const apiKey = process.env.OPENAI_API_KEY || readEnvLocal().OPENAI_API_KEY;
  if (!apiKey || !texts.length) return [];
  const model = process.env.OPENAI_HELP_EMBED_MODEL || 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings failed (${res.status}): ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return rows.map((r) => r.embedding);
}

function embedTextForChunk(chunk) {
  return `${chunk.itemTitle}\n${chunk.sectionTitle || ''}\n${chunk.content}`.slice(0, 8000);
}

async function main() {
  const skipEmbed = process.argv.includes('--no-embed');
  const includeFaqs = process.argv.includes('--include-faqs');

  const exportModUrl = pathToFileURL(path.join(ROOT, 'src/lib/helpKnowledgeExport.js')).href;
  const buildModUrl = pathToFileURL(path.join(ROOT, 'src/lib/helpKnowledgeBuild.js')).href;
  const { exportHelpMarkdownFiles, buildAiHelpChunks } = await import(exportModUrl);

  const written = exportHelpMarkdownFiles();
  console.log(`Exported ${written.length} markdown files to docs/help/`);

  let chunks = buildAiHelpChunks({ includeFaqs: false });

  const client = new Client(getDbConfig());
  await client.connect();

  try {
    if (includeFaqs) {
      const faqRes = await client.query(
        `SELECT id, screen_tag, question, answer, sort_order
         FROM documentation_faq
         WHERE is_active = true
           AND question NOT ILIKE 'What is the primary purpose of the %'
         ORDER BY screen_tag, sort_order`,
      );
      for (const row of faqRes.rows) {
        chunks.push({
          chunkKey: `faq:${row.id}`,
          source: 'faq',
          sectionId: 'faq',
          itemId: String(row.id),
          sectionTitle: `FAQ (${row.screen_tag})`,
          itemTitle: row.question,
          content: row.answer,
          audience: ['all'],
          sortOrder: 10000 + Number(row.sort_order || 0),
        });
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS documentation_help_chunks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        chunk_key VARCHAR(160) NOT NULL,
        source VARCHAR(32) NOT NULL DEFAULT 'help',
        section_id VARCHAR(64),
        item_id VARCHAR(64),
        section_title TEXT,
        item_title TEXT NOT NULL,
        content TEXT NOT NULL,
        audience TEXT[] NOT NULL DEFAULT ARRAY['all'],
        content_hash VARCHAR(64) NOT NULL,
        embedding JSONB,
        search_vector tsvector,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_documentation_help_chunks_key
        ON documentation_help_chunks (chunk_key);
    `);

    const activeKeys = [];
    const pendingEmbed = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const contentHash = hashContent(chunk.content);
      activeKeys.push(chunk.chunkKey);

      const existing = await client.query(
        `SELECT content_hash, embedding IS NOT NULL AS has_embedding
         FROM documentation_help_chunks WHERE chunk_key = $1`,
        [chunk.chunkKey],
      );
      const prev = existing.rows[0];
      const needsEmbed =
        !skipEmbed &&
        (process.env.OPENAI_API_KEY || readEnvLocal().OPENAI_API_KEY) &&
        (!prev || prev.content_hash !== contentHash || !prev.has_embedding);

      if (needsEmbed) pendingEmbed.push({ chunk, contentHash, index: i });
      else {
        let embeddingJson = null;
        if (prev?.has_embedding) {
          const keep = await client.query(`SELECT embedding FROM documentation_help_chunks WHERE chunk_key = $1`, [
            chunk.chunkKey,
          ]);
          if (keep.rows[0]?.embedding) embeddingJson = JSON.stringify(keep.rows[0].embedding);
        }
        await client.query(
          `INSERT INTO documentation_help_chunks (
             chunk_key, source, section_id, item_id, section_title, item_title, content,
             audience, content_hash, embedding, search_vector, sort_order, is_active, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10::jsonb,
             to_tsvector('english', coalesce($5, '') || ' ' || $6 || ' ' || $7),
             $11, true, NOW()
           )
           ON CONFLICT (chunk_key) DO UPDATE SET
             source = EXCLUDED.source,
             section_id = EXCLUDED.section_id,
             item_id = EXCLUDED.item_id,
             section_title = EXCLUDED.section_title,
             item_title = EXCLUDED.item_title,
             content = EXCLUDED.content,
             audience = EXCLUDED.audience,
             content_hash = EXCLUDED.content_hash,
             embedding = COALESCE(EXCLUDED.embedding, documentation_help_chunks.embedding),
             search_vector = EXCLUDED.search_vector,
             sort_order = EXCLUDED.sort_order,
             is_active = true,
             updated_at = NOW()`,
          [
            chunk.chunkKey,
            chunk.source,
            chunk.sectionId,
            chunk.itemId,
            chunk.sectionTitle,
            chunk.itemTitle,
            chunk.content,
            chunk.audience,
            contentHash,
            embeddingJson,
            chunk.sortOrder ?? i,
          ],
        );
      }
    }

    const BATCH = 48;
    let embedded = 0;
    for (let b = 0; b < pendingEmbed.length; b += BATCH) {
      const slice = pendingEmbed.slice(b, b + BATCH);
      const vectors = await embedBatch(slice.map(({ chunk }) => embedTextForChunk(chunk)));
      for (let j = 0; j < slice.length; j += 1) {
        const { chunk, contentHash, index } = slice[j];
        const vec = vectors[j];
        const embeddingJson = vec ? JSON.stringify(vec) : null;
        if (vec) embedded += 1;
        await client.query(
          `INSERT INTO documentation_help_chunks (
             chunk_key, source, section_id, item_id, section_title, item_title, content,
             audience, content_hash, embedding, search_vector, sort_order, is_active, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10::jsonb,
             to_tsvector('english', coalesce($5, '') || ' ' || $6 || ' ' || $7),
             $11, true, NOW()
           )
           ON CONFLICT (chunk_key) DO UPDATE SET
             source = EXCLUDED.source,
             section_id = EXCLUDED.section_id,
             item_id = EXCLUDED.item_id,
             section_title = EXCLUDED.section_title,
             item_title = EXCLUDED.item_title,
             content = EXCLUDED.content,
             audience = EXCLUDED.audience,
             content_hash = EXCLUDED.content_hash,
             embedding = COALESCE(EXCLUDED.embedding, documentation_help_chunks.embedding),
             search_vector = EXCLUDED.search_vector,
             sort_order = EXCLUDED.sort_order,
             is_active = true,
             updated_at = NOW()`,
          [
            chunk.chunkKey,
            chunk.source,
            chunk.sectionId,
            chunk.itemId,
            chunk.sectionTitle,
            chunk.itemTitle,
            chunk.content,
            chunk.audience,
            contentHash,
            embeddingJson,
            chunk.sortOrder ?? index,
          ],
        );
      }
      process.stdout.write(`  embedded ${Math.min(b + BATCH, pendingEmbed.length)}/${pendingEmbed.length}\r`);
    }

    await client.query(
      `UPDATE documentation_help_chunks SET is_active = false, updated_at = NOW()
       WHERE chunk_key <> ALL($1::text[])`,
      [activeKeys],
    );

    console.log(`\nHelp knowledge sync: ${chunks.length} chunks indexed, ${embedded} embedded.`);
    console.log('AI strategy: full docs/help corpus in LLM context (Cursor-style).');
    if (skipEmbed || !(process.env.OPENAI_API_KEY || readEnvLocal().OPENAI_API_KEY)) {
      console.log('Embeddings skipped — set OPENAI_API_KEY and re-run for semantic retrieval boost.');
    }
    if (!includeFaqs) {
      console.log('Boilerplate FAQs excluded (use --include-faqs to add curated FAQs).');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
