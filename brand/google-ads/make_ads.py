import sys, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
MARK = '''<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f1f4b"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>
<rect width="64" height="64" rx="15" fill="url(#g)"/><path d="M14 48 H26 Q32 48 32 42 V28 Q32 22 38 22 H44" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="14" cy="48" r="4.5" fill="#fff"/><circle cx="32" cy="35" r="4" fill="#1a3a9e" stroke="#fff" stroke-width="3"/><circle cx="47" cy="22" r="8" fill="#f59e0b"/><circle cx="47" cy="22" r="3" fill="#0f1f4b"/></svg>'''

# Original stylised map scene (no real map data): land blocks, roads, route, truck, destination.
def scene(w, h, vb='0 0 600 600'):
    return f'''<svg viewBox="{vb}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect x="-600" y="-600" width="1800" height="1800" fill="#e8eefb"/>
  <g fill="#dbe4f7">
    <path d="M-620 60 C-300 120 -120 40 -20 80 C80 40 160 120 260 90 S420 20 620 70 S900 120 1220 60 V-620 H-620Z"/>
    <path d="M-620 440 C-300 400 -120 460 -20 420 C90 380 140 470 250 450 S430 380 620 430 S900 470 1220 420 V1220 H-620Z"/>
  </g>
  <g stroke="#f4f7ff" stroke-width="6" fill="none"><path d="M-100 -620 V1220"/><path d="M-300 -620 V1220"/><path d="M700 -620 V1220"/><path d="M900 -620 V1220"/></g>
  <g fill="#cfe0d4" opacity=".9"><circle cx="-180" cy="250" r="80"/><circle cx="780" cy="330" r="90"/><circle cx="-60" cy="560" r="50"/><circle cx="470" cy="470" r="70"/><circle cx="110" cy="190" r="48"/><ellipse cx="350" cy="300" rx="38" ry="26"/></g>
  <g stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round" opacity=".95">
    <path d="M-620 300 H1220"/><path d="M200 -620 V1220"/><path d="M420 -620 V1220"/><path d="M-620 540 C-200 500 0 520 -20 520 C150 500 300 560 620 500 S900 520 1220 480"/><path d="M-620 60 L1220 290"/>
  </g>
  <g stroke="#f4f7ff" stroke-width="6" fill="none"><path d="M-620 380 H1220"/><path d="M90 -620 V1220"/><path d="M520 -620 V1220"/><path d="M300 -620 V1220"/></g>
  <!-- route -->
  <path d="M110 470 H190 Q230 470 230 430 V300 Q230 260 270 260 H350 Q400 260 400 210 V160 Q400 130 430 130 H470" fill="none" stroke="#1d4ed8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M110 470 H190 Q230 470 230 430 V300 Q230 260 270 260 H350" fill="none" stroke="#93b4ff" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 14"/>
  <circle cx="110" cy="470" r="16" fill="#fff" stroke="#1d4ed8" stroke-width="8"/>
  <circle cx="230" cy="365" r="11" fill="#fff" stroke="#1d4ed8" stroke-width="6"/>
  <!-- destination pin -->
  <g transform="translate(486 130)">
    <circle r="46" fill="#f59e0b" opacity=".18"/><circle r="30" fill="#f59e0b"/><circle r="11" fill="#0f1f4b"/>
  </g>
  <!-- truck badge -->
  <g transform="translate(350 260)">
    <circle r="38" fill="#fff" stroke="#1d4ed8" stroke-width="5"/>
    <g transform="translate(-22 -15)">
      <rect x="0" y="4" width="28" height="20" rx="3" fill="#1d4ed8"/>
      <path d="M28 10 H37 L44 18 V24 H28Z" fill="#0f1f4b"/>
      <rect x="31" y="12" width="6" height="5" rx="1" fill="#bfdbfe"/>
      <circle cx="9" cy="27" r="5" fill="#0f172a"/><circle cx="36" cy="27" r="5" fill="#0f172a"/>
      <circle cx="9" cy="27" r="2" fill="#fff"/><circle cx="36" cy="27" r="2" fill="#fff"/>
    </g>
  </g>
</svg>'''

def status_card(scale=1.0):
    return f'''<div class="card" style="transform:scale({scale})">
  <div class="dot"></div><div><div class="k">Out for delivery</div><div class="v">Arriving today</div></div></div>'''

CSS = '''*{box-sizing:border-box;margin:0}body{font-family:Inter,"Segoe UI",Arial,sans-serif;overflow:hidden}
.card{position:absolute;white-space:nowrap;display:flex;gap:16px;align-items:center;background:#fff;border-radius:22px;padding:22px 28px;box-shadow:0 18px 40px rgba(15,31,75,.22);transform-origin:top left}
.card .dot{width:22px;height:22px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 7px #dcfce7}
.card .k{font-weight:700;font-size:28px;color:#0f172a}.card .v{font-size:22px;color:#64748b;margin-top:2px}
.brand{display:flex;align-items:center;gap:18px}.brand svg{width:84px;height:84px}
.brand b{font-size:46px;letter-spacing:-1px;color:#fff}.brand b span{color:#fbbf24}
h1{color:#fff;font-size:64px;line-height:1.08;letter-spacing:-1.5px}
p.sub{color:#c7d2fe;font-size:30px;line-height:1.35}
.panel{background:linear-gradient(135deg,#0f1f4b,#1d4ed8)}'''

def page(w, h, body):
    return f'<html><head><meta charset="utf-8"><style>{CSS}</style></head><body style="width:{w}px;height:{h}px;position:relative">{body}</body></html>'

designs = {}
# ---- Landscape 1200x628 ----
designs['landscape-1200x628-headline.png'] = (1200, 628, f'''
<div class="panel" style="position:absolute;inset:0"></div>
<div style="position:absolute;right:0;top:0;width:560px;height:628px;overflow:hidden;clip-path:polygon(12% 0,100% 0,100% 100%,0 100%)">{scene(560,628,'40 70 500 560.7')}</div>
<div style="position:absolute;left:130px;top:96px;width:520px">
  <div class="brand">{MARK}<b>Track My <span>Ship</span></b></div>
  <h1 style="margin-top:44px">Track any parcel<br>live on a map</h1>
  <p class="sub" style="margin-top:22px">DTDC, Blue Dart, Delhivery,<br>Speed Post &amp; more</p>
</div>''')
designs['landscape-1200x628-no-text.png'] = (1200, 628, f'''
<div style="position:absolute;inset:0">{scene(1200,628,'-160 60 920 481.7')}</div>''')
# ---- Square 1200x1200 ----
designs['square-1200x1200-headline.png'] = (1200, 1200, f'''
<div class="panel" style="position:absolute;inset:0"></div>
<div style="position:absolute;left:120px;top:130px" class="brand">{MARK}<b>Track My <span>Ship</span></b></div>
<h1 style="position:absolute;left:120px;top:265px;font-size:78px">Track any parcel<br>live on a map</h1>
<div style="position:absolute;left:120px;right:120px;top:540px;height:540px;border-radius:36px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.3)">{scene(960,540,'-110 105 760 427.5')}</div>
<div style="position:absolute;right:160px;top:930px;width:330px">{status_card(1.0)}</div>''')
designs['square-1200x1200-no-text.png'] = (1200, 1200, f'<div style="position:absolute;inset:0">{scene(1200,1200)}</div>')
# ---- Portrait 960x1200 ----
designs['portrait-960x1200-headline.png'] = (960, 1200, f'''
<div class="panel" style="position:absolute;inset:0"></div>
<div style="position:absolute;left:96px;top:130px" class="brand">{MARK}<b>Track My <span>Ship</span></b></div>
<h1 style="position:absolute;left:96px;top:262px;font-size:70px">Track any parcel<br>live on a map</h1>
<div style="position:absolute;left:96px;right:96px;top:520px;height:560px;border-radius:36px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.3)">{scene(768,560,'-30 95 600 437.5')}</div>
<div style="position:absolute;right:130px;top:945px;width:330px">{status_card(0.92)}</div>''')
# ---- Logos ----
designs['logo-square-1200x1200.png'] = (1200, 1200, f'''<div style="position:absolute;inset:0;background:linear-gradient(135deg,#0f1f4b,#1d4ed8)"></div>
<svg style="position:absolute;left:0;top:0" width="1200" height="1200" viewBox="0 0 64 64"><g transform="translate(32 32) scale(0.78) translate(-30.5 -35)">
<path d="M14 48 H26 Q32 48 32 42 V28 Q32 22 38 22 H44" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="14" cy="48" r="4.5" fill="#fff"/><circle cx="32" cy="35" r="4" fill="#1a3a9e" stroke="#fff" stroke-width="3"/><circle cx="47" cy="22" r="8" fill="#f59e0b"/><circle cx="47" cy="22" r="3" fill="#0f1f4b"/></g></svg>''')
designs['logo-landscape-1200x300.png'] = (1200, 300, f'''<div style="position:absolute;inset:0;background:#fff"></div>
<div class="brand" style="position:absolute;left:150px;top:75px;gap:30px">{MARK.replace('<svg ','<svg style="width:150px;height:150px" ')}<b style="color:#0f172a;font-size:96px;letter-spacing:-2.5px">Track My <span style="color:#1d4ed8">Ship</span></b></div>''')

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h, body) in designs.items():
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.set_content(page(w, h, body)); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(OUT, name))
        pg.close()
    b.close()
print('done')
