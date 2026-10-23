// Server-side SEO for the single-page app: each public page (home + courier pages)
// is sent with its own <title>, description, canonical URL, social tags, JSON-LD
// and a short text block search engines can read before JavaScript runs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEO = JSON.parse(readFileSync(join(__dirname, '../../client/src/seo-pages.json'), 'utf8'));
const SITE = (process.env.SITE_URL || SEO.site.url).replace(/\/$/, '');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function courierPageFor(path) {
  return SEO.couriers.find((c) => c.path === path.replace(/\/$/, '')) || null;
}

export function pageFor(path) {
  if (path === '/' || path === '') return { ...SEO.home, canonical: `${SITE}/` };
  const info = SEO.pages.find((p) => p.path === path.replace(/\/$/, ''));
  if (info) return { ...info, canonical: `${SITE}${info.path}`, info: true };
  const c = courierPageFor(path);
  if (!c) return null;
  return {
    path: c.path,
    canonical: `${SITE}${c.path}`,
    title: `${c.name} Tracking – Track ${c.name} Courier & Consignment Live | Track My Ship`,
    description: `${c.name} tracking: enter your ${c.name} AWB / consignment number to see live status, delivery updates and the parcel's route on a map. Free and fast.`,
    h1: `${c.name} Tracking`,
    sub: `Enter your ${c.name} consignment / AWB number (${c.example}) to track it live on a map.`,
    courier: c,
  };
}

function jsonLd(page) {
  if (page.info) return '';
  const graph = [
    {
      '@type': 'FAQPage',
      mainEntity: SEO.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  if (page.courier) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Track My Ship', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: page.canonical },
      ],
    });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

// Crawlable fallback content; React replaces it as soon as the app loads.
function prerender(page) {
  const links = SEO.couriers.map((c) => `<li><a href="${c.path}">${esc(c.name)} tracking</a></li>`).join('');
  const faq = SEO.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('');
  return `<main class="prerender"><h1>${esc(page.h1)}</h1><p>${esc(page.sub)}</p>`
    + `<h2>Track parcels from popular couriers</h2><ul>${links}</ul>`
    + `<h2>Frequently asked questions</h2>${faq}`
    + `<p><a href="/contact">About &amp; Contact</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p></main>`;
}

export function renderPage(template, path, { noindex = false } = {}) {
  const page = pageFor(path) || { ...SEO.home, canonical: `${SITE}/` };
  const setMeta = (html, attr, key, value) =>
    html.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${esc(value)}$2`);

  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${page.canonical}$2`)
    .replace(/https:\/\/trackmyship\.co(?=\/)/g, SITE);
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'property', 'og:url', page.canonical);
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  if (noindex) html = setMeta(html, 'name', 'robots', 'noindex, follow');
  return html
    .replace('</head>', `${jsonLd(page)}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${prerender(page)}</div>`);
}

export function sitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, priority: '1.0' },
    ...SEO.couriers.map((c) => ({ loc: `${SITE}${c.path}`, priority: '0.8' })),
    ...SEO.pages.map((p) => ({ loc: `${SITE}${p.path}`, priority: '0.3' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n')
    + `\n</urlset>\n`;
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`;
}
