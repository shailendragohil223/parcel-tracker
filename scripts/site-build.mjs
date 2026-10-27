// Fingerprint of the client source, stored next to the build (client/dist-ssr/.source-hash)
// so scripts/start.mjs can tell whether the existing build matches the current code.
// Run directly (`node scripts/site-build.mjs`) to record the fingerprint after a build.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const stampFile = join(root, 'client/dist-ssr/.source-hash');

export function sourceHash() {
  const h = createHash('sha256');
  const add = (p) => {
    const full = join(root, p);
    if (!existsSync(full)) return;
    if (statSync(full).isDirectory()) {
      for (const name of readdirSync(full).sort()) add(join(p, name));
    } else {
      h.update(p).update(readFileSync(full));
    }
  };
  ['client/src', 'client/public', 'client/index.html', 'client/package.json', 'client/vite.config.js'].forEach(add);
  return h.digest('hex');
}

export const buildIsCurrent = () =>
  existsSync(join(root, 'client/dist/index.html')) && existsSync(join(root, 'client/dist-ssr/entry-server.js')) &&
  existsSync(stampFile) && readFileSync(stampFile, 'utf8') === sourceHash();

export const writeStamp = () => writeFileSync(stampFile, sourceHash());

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeStamp();
  console.log('[build] recorded source fingerprint');
}
