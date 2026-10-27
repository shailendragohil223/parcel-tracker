// Production start for hosts that don't run "npm install" / "npm run build" for you
// (e.g. GoDaddy, which skips installing when there is no package-lock.json).
// Installs server packages if missing, and (re)builds the React app whenever it is missing
// or its source changed since the last build — hosts like GoDaddy keep the old build folder
// between deploys, so checking only "does a build exist" would keep serving an old site.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { root, buildIsCurrent, writeStamp } from './site-build.mjs';

const run = (cmd) => {
  console.log(`[start] ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
};

try {
  if (!existsSync(join(root, 'server/node_modules/express'))) {
    run('npm install --prefix server --omit=dev --no-audit --no-fund');
  }
  if (buildIsCurrent()) {
    console.log('[start] Site build is up to date');
  } else {
    console.log('[start] No build, or source changed since the last build — building the site');
    run('npm install --prefix client --no-audit --no-fund');
    run('npm run build --prefix client');
    writeStamp();
  }
} catch (e) {
  console.error('[start] Setup failed — the server cannot start without its packages.', e.message);
  process.exit(1);
}

await import('../server/src/index.js');
