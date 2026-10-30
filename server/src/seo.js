// Server-side SEO for the React app. For each public page the server sends:
// - fully rendered page content (React SSR from client/dist-ssr) so crawlers that don't run
//   JavaScript — including AI search bots such as OAI-SearchBot — can read everything;
// - its own <title>, description, canonical URL, social tags and JSON-LD that matches the page.
// Also generates robots.txt, sitemap.xml, llms.txt and ads.txt from client/src/seo-pages.json.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { courierFaq } from '../../client/src/courier-faq.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEO = JSON.parse(readFileSync(join(__dirname, '../../client/src/seo-pages.json'), 'utf8'));
const SITE = (process.env.SITE_URL || SEO.site.url).replace(/\/$/, '');
const B = SEO.business;
// Blog: post list in client/src/blog/posts.json, post text in client/src/blog/<slug>.md
const BLOG = JSON.parse(readFileSync(join(__dirname, '../../client/src/blog/posts.json'), 'utf8'));
const POSTS = [...BLOG.posts].sort((a, b) => b.published.localeCompare(a.published));
const blogUpdated = () => POSTS.reduce((d, p) => (p.updated > d ? p.updated : d), POSTS[0]?.updated || SEO.site.updated);

// React server renderer, built by `npm run build` (client/dist-ssr). Falls back to a text summary if missing.
let ssrRender = null;
const ssrEntry = join(__dirname, '../../client/dist-ssr/entry-server.js');
if (existsSync(ssrEntry)) {
  try {
    ssrRender = (await import(pathToFileURL(ssrEntry).href)).render;
  } catch (e) {
    console.warn('[seo] Server-side rendering unavailable:', e.message);
  }
} else {
  console.warn('[seo] client/dist-ssr not built — pages will use the text fallback. Run npm run build.');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p);

export function courierPageFor(path) {
  return SEO.couriers.find((c) => c.path === clean(path)) || null;
}

export function pageFor(path) {
  path = clean(path);
  if (path === '/' || path === '') return { ...SEO.home, path: '/', canonical: `${SITE}/`, updated: SEO.site.updated };
  const info = SEO.pages.find((p) => p.path === path);
  if (info) return { ...info, canonical: `${SITE}${info.path}`, info: true };
  if (path === BLOG.index.path) return { ...BLOG.index, canonical: `${SITE}${path}`, updated: blogUpdated(), info: true, blogIndex: true };
  const post = POSTS.find((p) => `/blog/${p.slug}` === path);
  if (post) {
    return {
      path, canonical: `${SITE}${path}`, type: 'article', info: true, post,
      title: `${post.title} | Track My Ship`, description: post.description, h1: post.h1, sub: post.description,
      published: post.published, updated: post.updated,
    };
  }
  const c = courierPageFor(path);
  if (!c) return null;
  return {
    path: c.path,
    canonical: `${SITE}${c.path}`,
    updated: SEO.site.updated,
    title: `${c.name} Tracking – Live Parcel Status | Track My Ship`,
    description: `${c.name} tracking: enter your ${c.name} ${c.numberName} to see live status, every scan and the parcel's route on a map. How to find your number and who to contact.`,
    h1: `${c.name} Tracking`,
    sub: `Enter your ${c.name} ${c.numberName} (${c.example}) to track it live on a map.`,
    courier: c,
  };
}

// ---------- Structured data: only what is visible on the page ----------
const ORG = { '@id': `${SITE}/#org` };
const WEBSITE = { '@id': `${SITE}/#website` };
const qa = (list) => list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));

function jsonLd(page) {
  const crumbs = page.path === '/' ? null : {
    '@type': 'BreadcrumbList',
    '@id': `${page.canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Track My Ship', item: `${SITE}/` },
      ...(page.post ? [{ '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}${BLOG.index.path}` }] : []),
      { '@type': 'ListItem', position: page.post ? 3 : 2, name: page.h1, item: page.canonical },
    ],
  };
  const webPage = {
    '@type': page.path === '/contact' ? ['WebPage', 'ContactPage', 'AboutPage'] : page.blogIndex ? ['WebPage', 'CollectionPage'] : 'WebPage',
    '@id': `${page.canonical}#webpage`,
    url: page.canonical,
    name: page.title,
    description: page.description,
    isPartOf: WEBSITE,
    publisher: ORG,
    inLanguage: 'en-IN',
    ...(page.updated ? { dateModified: page.updated } : {}),
    ...(crumbs ? { breadcrumb: { '@id': crumbs['@id'] } } : {}),
  };
  const graph = [webPage];
  if (crumbs) graph.push(crumbs);

  const BLOG_ID = `${SITE}${BLOG.index.path}#blog`;
  if (page.blogIndex) {
    graph.push({
      '@type': 'Blog',
      '@id': BLOG_ID,
      name: BLOG.index.h1,
      url: page.canonical,
      description: page.description,
      publisher: ORG,
      inLanguage: 'en-IN',
      blogPost: POSTS.map((p) => ({
        '@type': 'BlogPosting', headline: p.h1, url: `${SITE}/blog/${p.slug}`, datePublished: p.published, dateModified: p.updated,
      })),
    });
  } else if (page.type === 'article') {
    graph.push({
      '@type': page.post ? 'BlogPosting' : 'Article',
      '@id': `${page.canonical}#article`,
      ...(page.post ? { isPartOf: { '@id': BLOG_ID } } : {}),
      headline: page.post ? page.h1 : page.title.replace(/ \| Track My Ship$/, ''),
      description: page.description,
      mainEntityOfPage: { '@id': webPage['@id'] },
      datePublished: page.published,
      dateModified: page.updated,
      author: ORG,
      publisher: ORG,
      image: `${SITE}/og-image.png`,
      inLanguage: 'en-IN',
    });
  } else if (!page.info) {
    // Home and courier pages show the general FAQ; courier pages also show their own Q&A.
    const list = [...(page.courier ? courierFaq(page.courier).slice(1) : []), ...SEO.faq];
    graph.push({ '@type': 'FAQPage', '@id': `${page.canonical}#faq`, mainEntity: qa(list) });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

// Text-only fallback when the SSR bundle isn't available.
function fallbackContent(page) {
  const links = SEO.couriers.map((c) => `<li><a href="${c.path}">${esc(c.name)} tracking</a></li>`).join('');
  const faq = SEO.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('');
  return `<main class="prerender"><h1>${esc(page.h1)}</h1><p>${esc(page.sub)}</p>`
    + `<h2>Track parcels from popular couriers</h2><ul>${links}</ul>`
    + `<h2>Frequently asked questions</h2>${faq}`
    + `<p><a href="/parcel-tracking-guide">Parcel tracking guide</a> · <a href="/blog">Blog</a> · <a href="/contact">About &amp; Contact</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p></main>`;
}

export function renderPage(template, path, { noindex = false } = {}) {
  const known = pageFor(path);
  const page = known || { ...SEO.home, path: '/', canonical: `${SITE}/`, title: 'Page not found | Track My Ship' };
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
  if (page.type === 'article') html = html.replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="article" />');

  let body;
  try {
    body = ssrRender ? `<div id="root" data-ssr="1">${ssrRender(known ? page.path : path)}</div>` : null;
  } catch (e) {
    console.warn('[seo] SSR failed for', path, e.message);
  }
  body = body || `<div id="root">${fallbackContent(page)}</div>`;
  return html
    .replace('</head>', `${known ? jsonLd(page) : ''}</head>`)
    .replace('<div id="root"></div>', body);
}

// ---------- sitemap.xml: canonical, indexable pages only ----------
export function sitemapXml() {
  const urls = [
    { loc: `${SITE}/`, lastmod: SEO.site.updated, priority: '1.0' },
    ...SEO.couriers.map((c) => ({ loc: `${SITE}${c.path}`, lastmod: SEO.site.updated, priority: '0.8' })),
    ...SEO.pages.map((p) => ({ loc: `${SITE}${p.path}`, lastmod: p.updated, priority: p.type === 'article' ? '0.7' : '0.3' })),
    { loc: `${SITE}${BLOG.index.path}`, lastmod: blogUpdated(), priority: '0.6' },
    ...POSTS.map((p) => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.updated, priority: '0.6' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')
    + `\n</urlset>\n`;
}

// ---------- robots.txt ----------
// A crawler follows only the most specific group that names it, so every named group
// repeats the /api/ rule. AI *training* crawlers are only blocked if AI_TRAINING_CRAWLERS=block.
const TRAINING_BOTS = ['GPTBot', 'Google-Extended', 'CCBot', 'ClaudeBot'];
export function robotsTxt() {
  const lines = [
    '# Track My Ship robots.txt',
    '# Public pages are open to search engines and AI search crawlers.',
    '# /api/ returns live shipment data and is not for crawling.',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# AI search crawlers (they surface and link pages in AI search answers):',
    '# OpenAI OAI-SearchBot https://developers.openai.com/api/docs/bots',
    '# Anthropic Claude-SearchBot https://support.claude.com/en/articles/8896518',
    '# Perplexity PerplexityBot https://docs.perplexity.ai/guides/bots',
    'User-agent: OAI-SearchBot',
    'User-agent: Claude-SearchBot',
    'User-agent: PerplexityBot',
    'Allow: /',
    'Disallow: /api/',
  ];
  if ((process.env.AI_TRAINING_CRAWLERS || '').toLowerCase() === 'block') {
    lines.push('', '# AI model-training crawlers: not allowed (search crawlers above are unaffected)');
    for (const bot of TRAINING_BOTS) lines.push(`User-agent: ${bot}`);
    lines.push('Disallow: /');
  }
  lines.push('', `Sitemap: ${SITE}/sitemap.xml`, '');
  return lines.join('\n');
}

// ---------- llms.txt: plain-text summary of the site for AI assistants ----------
export function llmsTxt() {
  const link = (path, name, note) => `- [${name}](${SITE}${path})${note ? `: ${note}` : ''}`;
  const guide = SEO.pages.find((p) => p.type === 'article');
  return [
    '# Track My Ship',
    '',
    '> Free courier tracking website for India. Enter a courier tracking (AWB / consignment) number to see the latest status, scan history and route on a map.',
    '',
    `Track My Ship is an independent tracking website based in ${B.address || 'India'}${B.email ? ` (contact: ${B.email})` : ''}. It is not a courier: it does not book, carry or deliver parcels, and it is not affiliated with the couriers it covers. It shows the tracking information couriers publish (via a tracking data provider) for DTDC, Blue Dart, Delhivery, Speed Post (India Post), Trackon and others. Tracking needs the courier's tracking number; search by mobile number, email, LR number or order ID is not offered.`,
    '',
    '## Main pages',
    link('/', 'Track a parcel', 'search box for any tracking number; results show status, scan history and map'),
    guide ? link(guide.path, 'Parcel tracking guide', 'what AWB, consignment, waybill and LR numbers are; how to find your AWB; which courier has your parcel; what each tracking status means; why tracking shows no information or stops updating; what to do about delays and failed delivery attempts') : null,
    '',
    '## Courier tracking pages',
    ...SEO.couriers.map((c) => link(c.path, `${c.name} tracking`, `how to track a ${c.name} parcel; the ${c.numberName} is ${c.format}`)),
    '',
    '## Blog',
    link(BLOG.index.path, 'Track My Ship Blog', 'practical help when a parcel is late, missing or stuck'),
    ...POSTS.map((p) => link(`/blog/${p.slug}`, p.h1, p.description)),
    '',
    '## About',
    link('/contact', 'About & Contact'),
    link('/privacy-policy', 'Privacy Policy'),
    link('/terms', 'Terms of Use'),
    '',
    '## Notes for AI assistants',
    '- Tracking results (links like /?q=NUMBER) contain individual shipment data, are marked noindex and should not be quoted or stored.',
    '- /api/ endpoints are not for crawling.',
    '- Delivery dates are estimates from the courier; for problems with a parcel, users should contact the courier or the sender.',
    '',
  ].filter((l) => l !== null).join('\n');
}

// ---------- Blog RSS feed (/blog/rss.xml): lets feed readers and search engines find new posts ----------
const rfc822 = (d) => new Date(`${d}T09:00:00+05:30`).toUTCString();
export function blogRss() {
  const items = POSTS.map((p) => `    <item>
      <title>${esc(p.h1)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${rfc822(p.published)}</pubDate>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(BLOG.index.h1)}</title>
    <link>${SITE}${BLOG.index.path}</link>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc(BLOG.index.description)}</description>
    <language>en-in</language>
    <lastBuildDate>${rfc822(blogUpdated())}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// ---------- ads.txt (Google AdSense) ----------
export function adsTxt() {
  const pub = (process.env.ADSENSE_PUBLISHER_ID || B.adsensePublisherId || '').trim();
  return pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : null;
}
