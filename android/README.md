# Track My Ship – Android app

A [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity):
the app opens https://trackmyship.co full-screen using the phone's Chrome engine. It always
shows the live site, so site updates reach app users without a new app release, and
Google Analytics / AdSense keep working as on the web.

- Package name: `co.trackmyship.app`
- Target API 36 (Google Play's requirement from 31 Aug 2026), min Android 6.0
- Launch URL: `https://trackmyship.co/?utm_source=android_app&utm_medium=app` (app traffic shows as its own source in Analytics)
- trackmyship.co links on the phone open in the app

## Building

GitHub Actions builds it (`.github/workflows/android.yml`): **Actions → Build Android app →
Run workflow** (enter a version name such as `1.0.1`). Download the files from the run's
**Artifacts**:

| File | Use |
|---|---|
| `…-test.apk` | Install on a phone to try it (shows a browser address bar — it's debug-signed) |
| `…-playstore.aab` | Upload to Google Play |
| `…-release.apk` | Signed APK, for sharing outside Play |

The `.aab` / release APK are built only when these repository secrets exist
(**Settings → Secrets and variables → Actions → New repository secret**):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the upload keystore, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |

Keep the keystore file and password backed up privately; never commit them. With Play App
Signing, a lost upload key can be reset from Play Console, but it takes a few days.

The version code is the workflow run number, so every build can be uploaded as an update.

## Full-screen (no address bar): Digital Asset Links

The site serves `/.well-known/assetlinks.json` (`server/src/index.js`) listing the SHA-256
fingerprints of the certificates allowed to open it full-screen. The upload key's is built in.
**After the first upload to Play**, copy the *App signing key certificate* SHA-256 from
Play Console → your app → **Test and release → App integrity → App signing**, and add it to
the server's environment on GoDaddy:

```
ANDROID_CERT_SHA256=AB:CD:…        (comma-separate several)
```

Restart the app, then check https://trackmyship.co/.well-known/assetlinks.json shows it.
Without this step the Play-installed app shows a small address bar at the top.

## Play Store listing assets

`store/play-icon-512.png` (app icon) and `store/feature-graphic-1024x500.png` (feature graphic).
You also need at least 2 phone screenshots — take them from the installed app.
