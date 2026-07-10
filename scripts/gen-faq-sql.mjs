import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const faqHtml = path.resolve(
  __dirname,
  "../../Prompts/FAQs.html",
);
const outPath = path.resolve(
  __dirname,
  "../db/seeds/documentation_faq_from_prompts.sql",
);

function esc(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

const html = fs.readFileSync(faqHtml, "utf8");
const sections = html.split('class="screen-section"').slice(1);
const rows = [];

for (const sec of sections) {
  const tagM = sec.match(/class="screen-tag">([^<]+)</);
  if (!tagM) continue;
  const screenTag = tagM[1].trim();
  const re =
    /<div class="faq-q">([^<]+)<\/div>\s*<p class="faq-a">([\s\S]*?)<\/p>/g;
  let m;
  let order = 0;
  while ((m = re.exec(sec)) !== null) {
    const q = stripHtml(m[1]).replace(/^Q\d+\.\s*/, "").trim();
    const a = stripHtml(m[2]).replace(/^A:\s*/i, "").trim();
    if (q && a) rows.push({ screenTag, q, a, order: order++ });
  }
}

let out = "";
out += "-- Generated from Prompts/FAQs.html\n";
out += "-- Requires: CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; (or pgcrypto for gen_random_uuid)\n\n";
out += "CREATE TABLE IF NOT EXISTS documentation_faq (\n";
out += "  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n";
out += "  screen_tag VARCHAR(32) NOT NULL,\n";
out += "  question TEXT NOT NULL,\n";
out += "  answer TEXT NOT NULL,\n";
out += "  sort_order INT NOT NULL DEFAULT 0,\n";
out += "  is_active BOOLEAN NOT NULL DEFAULT true,\n";
out += "  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n";
out += "  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n";
out += "  CONSTRAINT documentation_faq_screen_tag_nonempty CHECK (length(trim(screen_tag)) > 0),\n";
out += "  CONSTRAINT documentation_faq_question_nonempty CHECK (length(trim(question)) > 0)\n";
out += ");\n\n";
out +=
  "CREATE INDEX IF NOT EXISTS idx_documentation_faq_screen_active\n";
out +=
  "  ON documentation_faq (screen_tag, sort_order)\n";
out += "  WHERE is_active = true;\n\n";
out += "TRUNCATE documentation_faq;\n\n";
out += "INSERT INTO documentation_faq (screen_tag, question, answer, sort_order) VALUES\n";
out += rows
  .map(
    (r) =>
      `  ('${esc(r.screenTag)}', '${esc(r.q)}', '${esc(r.a)}', ${r.order})`,
  )
  .join(",\n");
out += ";\n";

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, "utf8");
console.log(
  "rows",
  rows.length,
  "screens",
  new Set(rows.map((r) => r.screenTag)).size,
  "->",
  outPath,
);
