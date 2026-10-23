// Production start for hosts that don't run "npm install" / "npm run build" for you
// (e.g. GoDaddy, which skips installing when there is no package-lock.json).
// Installs server packages and builds the React app only if they're missing, then starts the API.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const has = (p) => existsSync(join(root, p));
const run = (cmd) => {
  console.log(`[start] ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
};

try {
  if (!has('server/node_modules/express')) {
    run('npm install --prefix server --omit=dev --no-audit --no-fund');
  }
  if (!has('client/dist/index.html')) {
    run('npm install --prefix client --no-audit --no-fund');
    run('npm run build --prefix client');
  }
} catch (e) {
  console.error('[start] Setup failed — the server cannot start without its packages.', e.message);
  process.exit(1);
}

await import('../server/src/index.js');
