// Writes sitemap.xml, robots.txt and llms.txt into client/public so they're visible in the repo.
// They are generated from client/src/seo-pages.json by the same code the server uses
// (server/src/seo.js) — the server serves identical content at /sitemap.xml etc.
// GitHub runs this on every change and commits the result, so the files never go stale.
// Run manually: node scripts/generate-crawler-files.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.SITE_URL = process.env.SITE_URL || 'https://trackmyship.co';
const { sitemapXml, robotsTxt, llmsTxt } = await import('../server/src/seo.js');
const out = join(dirname(fileURLToPath(import.meta.url)), '../client/public');
for (const [name, body] of [['sitemap.xml', sitemapXml()], ['robots.txt', robotsTxt()], ['llms.txt', llmsTxt()]]) {
  writeFileSync(join(out, name), body);
  console.log(`wrote client/public/${name}`);
}
