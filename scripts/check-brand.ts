import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SCAN_DIRS = ['src', 'scripts'];
const EXT = new Set(['.ts', '.tsx', '.md', '.html']);
const ALLOWLIST = new Set([
  join(ROOT, 'src/components/layouts/sponsoro-logo.tsx'),
  join(ROOT, 'scripts/check-brand.ts'),
]);

const FORBIDDEN = /\bSponsoro\b/i;

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (ALLOWLIST.has(path)) continue;
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(path, out);
      continue;
    }
    const ext = name.slice(name.lastIndexOf('.'));
    if (!EXT.has(ext)) continue;
    out.push(path);
  }
}

function main() {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    walk(join(ROOT, dir), files);
  }

  const hits: { file: string; line: number; text: string }[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (/^\s*import\s/.test(line)) return;
      if (/^\s*(\*|\/\/)/.test(line)) return;
      if (/SponsoroBrandLogo|sponsoro-logo/.test(line)) return;
      if (file.includes('/migrations/')) return;
      if (file.includes('.test.')) return;
      if (file.includes('/dev/components/')) return;
      if (file.includes('server/env.ts') || file.includes('public-env.ts')) return;
      if (line.includes('sponsoro.co.uk')) return;
      if (FORBIDDEN.test(line)) {
        hits.push({ file: file.replace(`${ROOT}/`, ''), line: index + 1, text: line.trim() });
      }
    });
  }

  if (hits.length > 0) {
    console.error(`Brand check failed: ${hits.length} forbidden "Sponsoro" reference(s).\n`);
    for (const hit of hits.slice(0, 50)) {
      console.error(`  ${hit.file}:${hit.line}  ${hit.text}`);
    }
    if (hits.length > 50) {
      console.error(`  … and ${hits.length - 50} more`);
    }
    process.exit(1);
  }

  console.log('Brand check passed (no "Sponsoro" in src/ or scripts/ user-facing paths).');
}

main();
