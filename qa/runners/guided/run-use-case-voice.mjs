/**
 * Run a use-case guided tour with auto advance + Edge TTS voice.
 * Usage: npm run test:guided:voice -- placement-drive-full
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REPO_ROOT, configPath } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = configPath('use-case-runners.json');

function main() {
  const slug = process.argv[2];
  if (!slug || slug === '--help' || slug === '-h') {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('\nUsage: npm run test:guided:voice -- <slug>\n');
    console.log('       qa\\runners\\batch\\run_use_case_auto_voice.bat <slug>\n');
    console.log('Slugs:\n');
    for (const c of manifest.cases) {
      console.log(`  ${c.slug.padEnd(32)} ${c.title}`);
    }
    console.log('\nOne-time voice setup: pip install -r qa/data/requirements/requirements-voice.txt');
    console.log('Terminal 1: npm run dev\n');
    process.exit(slug ? 0 : 1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entry = manifest.cases.find((c) => c.slug === slug);
  if (!entry) {
    console.error(`Unknown use-case slug: ${slug}`);
    console.error('Run: npm run test:guided:voice -- --help');
    process.exit(1);
  }

  const playbook = entry.playbook || entry.slug;
  const runGuided = path.join(__dirname, 'run-guided.mjs');
  console.log(`\n▶ Use case: ${entry.title}`);
  console.log(`  Playbook: ${playbook}`);
  console.log(`  Mode: auto + voice\n`);

  const result = spawnSync(
    process.execPath,
    [runGuided, '--playbook', playbook, '--auto', '--voice'],
    { stdio: 'inherit', cwd: REPO_ROOT },
  );
  process.exit(result.status ?? 1);
}

main();
