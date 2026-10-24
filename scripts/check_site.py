#!/usr/bin/env python3
"""Checks a running Track My Ship server the way crawlers and visitors see it.

Usage:  python3 scripts/check_site.py http://localhost:5099 [--browser]
        python3 scripts/check_site.py https://trackmyship.co      (live site)

Without JavaScript (like OAI-SearchBot and most AI crawlers) it checks: status codes,
robots.txt, sitemap.xml, llms.txt, ads.txt, canonical/robots tags, JSON-LD, page content,
redirects and internal links. Pass --demo when the server runs with DEMO_SHIPMENTS=true. With --browser it also loads pages in Chrome (Playwright,
channel="chrome") to catch JavaScript/hydration errors and to run a test search.
"""
import json, re, sys, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

BASE = sys.argv[1].rstrip('/')
SITE = 'https://trackmyship.co'
failures = []

def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok:
        failures.append(msg)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None

def get(path, headers=None, follow=False):
    req = urllib.request.Request(BASE + path, headers={'User-Agent': 'Mozilla/5.0 (compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot)', **(headers or {})})
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    try:
        r = opener.open(req, timeout=20)
        return r.status, dict(r.headers), r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode('utf-8', 'replace')

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links, self.h1, self.ld, self._in, self._buf, self.imgs_no_alt = [], [], [], None, '', 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href', '').startswith('/'): self.links.append(a['href'])
        if tag == 'h1': self._in, self._buf = 'h1', ''
        if tag == 'script' and a.get('type') == 'application/ld+json': self._in, self._buf = 'ld', ''
        if tag == 'img' and not a.get('alt'): self.imgs_no_alt += 1
    def handle_data(self, d):
        if self._in: self._buf += d
    def handle_endtag(self, tag):
        if self._in == 'h1' and tag == 'h1': self.h1.append(self._buf.strip()); self._in = None
        if self._in == 'ld' and tag == 'script': self.ld.append(self._buf); self._in = None

# ---- crawler files ----
s, h, robots = get('/robots.txt')
check(s == 200 and 'text/plain' in h.get('Content-Type', ''), 'robots.txt returns 200 text/plain')
groups = re.split(r'\n\s*\n', robots)
oai = next((g for g in groups if 'User-agent: OAI-SearchBot' in g), '')
check('Allow: /' in oai and 'Disallow: /api/' in oai, 'robots.txt: OAI-SearchBot allowed, /api/ disallowed')
check('User-agent: Claude-SearchBot' in oai and 'User-agent: PerplexityBot' in oai, 'robots.txt: Claude-SearchBot and PerplexityBot in the search-crawler group')
check('GPTBot' not in robots or 'AI_TRAINING' in robots, 'robots.txt: GPTBot left to the default rule (unchanged)')
check(re.search(r'User-agent: \*\nAllow: /\nDisallow: /api/', robots) is not None, 'robots.txt: default group keeps /api/ blocked')
check(f'Sitemap: {SITE}/sitemap.xml' in robots, 'robots.txt: sitemap URL listed')

s, h, sm = get('/sitemap.xml')
check(s == 200 and 'xml' in h.get('Content-Type', ''), 'sitemap.xml returns 200 XML')
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls = [u.find('s:loc', ns).text for u in ET.fromstring(sm).findall('s:url', ns)]
check(len(urls) >= 10 and all(u.startswith(SITE + '/') for u in urls), f'sitemap.xml valid, {len(urls)} https URLs on {SITE}')
check(not any('?' in u for u in urls), 'sitemap.xml has no query-string URLs')

s, _, llms = get('/llms.txt')
check(s == 200 and llms.startswith('# Track My Ship') and '/parcel-tracking-guide' in llms, 'llms.txt returns 200 with key pages')
s, _, ads = get('/ads.txt')
check(s == 200 and re.match(r'google\.com, pub-\d+, DIRECT, f08c47fec0942fa0', ads or '') is not None, 'ads.txt returns AdSense line')

# ---- every sitemap page, as a crawler without JavaScript ----
expect_text = {
    '/': 'Is Track My Ship a courier company?',
    '/dtdc-tracking': 'How to track a DTDC parcel',
    '/parcel-tracking-guide': 'How do I find my AWB number?',
    '/privacy-policy': 'Digital Personal Data Protection Act',
    '/terms': 'Governing law',
    '/contact': 'We do not book, carry or deliver parcels',
}
all_links, titles, descs = set(), {}, {}
for url in urls:
    path = url[len(SITE):] or '/'
    s, h, html = get(path)
    html = html.replace('<!-- -->', '')  # React SSR text separators
    p = Page(); p.feed(html)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    robots_meta = re.search(r'<meta name="robots" content="([^"]+)"', html)
    title = re.search(r'<title>([^<]+)</title>', html)
    desc = re.search(r'<meta name="description" content="([^"]+)"', html)
    titles[path] = title.group(1) if title else ''
    descs[path] = desc.group(1) if desc else ''
    ld_ok = True
    for block in p.ld:
        try: json.loads(block)
        except Exception: ld_ok = False
    ok = (s == 200 and canon and canon.group(1) == url and robots_meta and 'noindex' not in robots_meta.group(1)
          and 'data-ssr="1"' in html and len(p.h1) == 1 and ld_ok and p.ld and p.imgs_no_alt == 0
          and (path not in expect_text or expect_text[path] in html))
    detail = f'status={s} canonical={bool(canon and canon.group(1) == url)} ssr={"data-ssr" in html} h1={p.h1} ld={len(p.ld)}/{ld_ok} text={path not in expect_text or expect_text[path] in html}'
    check(bool(ok), f'{path}: 200, canonical, indexable, server-rendered, one H1, JSON-LD valid ({detail})')
    all_links.update(l.split('#')[0] for l in p.links)

check(len(set(titles.values())) == len(titles), 'page titles are unique')
check(len(set(descs.values())) == len(descs), 'meta descriptions are unique')

for link in sorted(all_links):
    s, h, _ = get(link)
    check(s == 200, f'internal link {link} -> {s}')

# ---- redirects, noindex and 404 ----
s, h, _ = get('/dtdc-tracking/')
check(s == 301 and h.get('Location', '').endswith('/dtdc-tracking'), 'trailing slash 301 -> /dtdc-tracking')
s, h, _ = get('/', {'Host': 'www.trackmyship.co'})
check(s == 301 and h.get('Location') == f'{SITE}/', 'www 301 -> main domain')
s, h, html = get('/?q=TMS100245781')
check(s == 200 and 'noindex' in h.get('X-Robots-Tag', '') and 'content="noindex, follow"' in html, 'tracking result URL is noindex')
s, h, _ = get('/api/health')
check('noindex' in h.get('X-Robots-Tag', ''), '/api/ responses are noindex')
s, h, html = get('/no-such-page')
check(s == 404 and 'Page not found' in html and 'noindex' in h.get('X-Robots-Tag', ''), 'unknown page returns 404 + noindex')
s, h, _ = get('/')
check('strict-origin-when-cross-origin' in h.get('Referrer-Policy', ''), 'Referrer-Policy allows map tiles')
if '--demo' not in sys.argv:  # with DEMO_SHIPMENTS=true the demo database answers mobile searches
    s, h, body = get('/api/track?q=9876543210')
    check(s == 400 and 'mobile number' in body, 'mobile-number search explains it is not available (400)')
for path in urls:
    s, _, html = get(path[len(SITE):] or '/')
    check(not re.search(r'Rahul|Priya|98\*{6}|TMS1002', html), f'{path[len(SITE):] or "/"}: no shipment or personal data in public HTML')

# ---- real browser (JavaScript, hydration, search) ----
if '--browser' in sys.argv:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome')
        for path in ['/', '/dtdc-tracking', '/parcel-tracking-guide', '/privacy-policy']:
            pg = b.new_page(); errors = []
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(BASE + path, wait_until='networkidle')
            bad = [e for e in errors if 'hydrat' in e.lower() or 'error' in e.lower()]
            bad = [e for e in bad if 'googletagmanager' not in e and 'ERR_' not in e]
            check(not bad, f'browser {path}: no JavaScript/hydration errors {bad[:2]}')
            pg.close()
        pg = b.new_page()
        pg.goto(BASE + '/', wait_until='networkidle')
        pg.fill('input[aria-label="Tracking input"]', 'TMS100245781')
        pg.click('button.btn')
        pg.wait_for_selector('.timeline li', timeout=15000)
        pg.wait_for_selector('.leaflet-container', timeout=15000)
        check(pg.locator('.timeline li').count() >= 3, 'browser: search shows tracking history and map')
        b.close()

print(f'\n{len(failures)} failure(s)')
sys.exit(1 if failures else 0)
