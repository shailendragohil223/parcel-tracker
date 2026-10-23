# Google Ads assets

| File | Use in Google Ads | Size |
|---|---|---|
| `landscape-1200x628-headline.png` | Images → landscape (1.91:1) | 1200×628 |
| `landscape-1200x628-no-text.png` | Images → landscape, no overlay | 1200×628 |
| `square-1200x1200-headline.png` | Images → square (1:1) | 1200×1200 |
| `square-1200x1200-no-text.png` | Images → square, no overlay | 1200×1200 |
| `portrait-960x1200-headline.png` | Images → portrait (4:5), optional | 960×1200 |
| `logo-square-1200x1200.png` | Logos → square (1:1) | 1200×1200 |
| `logo-landscape-1200x300.png` | Logos → landscape (4:1), optional | 1200×300 |

All PNG, no transparency, key content inside the centre 80%. Google recommends at least one image
without text per shape, so both versions are included. Regenerate with `python3 make_ads.py <out-dir>` (needs Python Playwright).
