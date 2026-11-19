// Golden Coast Cover Studio v2 — entry program (Node 22, standard library only).
// Copies app/ and screenshots/ from the repository to /output and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts.
// Outside the grader, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR stand in for
// /bot and /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// In the grader MAKEFUN_BOT_DIR is /bot. Outside the grader it is unset,
// so the repository that holds this file (main.ts's own directory) is used.
const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTree(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true });
  // Sorted traversal, so the copy order is the same on every machine.
  const entries = readdirSync(src, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      copyFileSync(from, to);
    } else {
      throw new Error(`refusing to copy a non-regular file: ${from}`);
    }
  }
}

copyTree(join(BOT_DIR, 'app'), join(OUTPUT_DIR, 'app'));
copyTree(join(BOT_DIR, 'screenshots'), join(OUTPUT_DIR, 'screenshots'));
writeFileSync(join(OUTPUT_DIR, 'dossier.json'), buildDossier(OUTPUT_DIR, CAPS));
