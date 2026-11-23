# Going to production

This is what changed on the `production-launch` branch (Oct 28, 2026) and what has to be set before real organizations and volunteers use the app.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Neon, already set |
| `NEXT_PUBLIC_APP_URL` | links in emails, the Google redirect | e.g. `https://sycamore-live.vercel.app` (no trailing slash) |
| `GOOGLE_CLIENT_ID` | "Continue with Google" | can be the same value as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | "Continue with Google" | server only, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the walk-in page's one-tap button | optional |
| `RESEND_API_KEY` | emailed sign-in codes, supervisor and guardian emails | without it, production hides email sign-in; Google still works |
| `MAIL_FROM` | the From line | e.g. `SycaMore <no-reply@yourdomain.org>`; the domain must be verified in Resend |
| `ANTHROPIC_API_KEY` | sheet import, stories, blurbs | set a monthly spend limit on the key too |
| `AI_DAILY_LIMIT` | site-wide ceiling on model calls per day | default 2000 |
| `SYCAMORE_DEMO` | `1` only on a demo deployment | shows the demo ribbon and the demo PIN hint |
| `BLOB_READ_WRITE_TOKEN` | story videos, voice notes and posters | set for you when a Blob store is connected (step 7); without it, media goes to local disk, which Vercel wipes |
| `IMPACT_KEY` | the team's `/impact` page | any long random string, shared with the team; without it, `/impact` is closed in production (open on a dev machine) |
| `CRON_SECRET` | the daily clean-up (`/api/cron/sweep`) | any long random string (`openssl rand -hex 32`); Vercel Cron sends it, and the route refuses everyone while it's unset |

## 2. Google OAuth client

1. Google Cloud Console → APIs & Services → **OAuth consent screen**:
   - user type External
   - app name SycaMore
   - support email
   - scopes `openid`, `email`, `profile` only (no verification review needed for these)
2. **Credentials → Create credentials → OAuth client ID → Web application**:
   - **Authorized JavaScript origins:** `https://<your domain>` and `http://localhost:3311`
   - **Authorized redirect URIs:** `https://<your domain>/api/auth/google/callback` and `http://localhost:3311/api/auth/google/callback`
3. Put the client ID and secret in the variables above, then redeploy.
4. Publish the consent screen ("In production"). While it is in Testing, only listed test users can sign in.

## 3. Database migrations (Neon)

Run both of these. Each is idempotent and safe on the live database:

```bash
psql "$DATABASE_URL" -f db/migrations-auth.sql
psql "$DATABASE_URL" -f db/migrations-transcript.sql
```

For the public opportunities board (`/opportunities`), run its migration and then load the listings. Both are idempotent and safe on the live database; run them before or right after deploying the code (until the table exists, the board shows no listings rather than an error):

```bash
psql "$DATABASE_URL" -f db/migrations-opportunities.sql
DATABASE_URL="$DATABASE_URL" npm run db:seed-opportunities
```

- The seed loads `db/opportunities.json`: real public listings, not demo data. It never resets a listing's `status` or `outbound_clicks`, and only moves `verified_on` forward. Run it again whenever the file changes.
- Hide a listing with `update opportunity set status = 'hidden' where slug = '…';`. There's no admin screen for this (see Known gaps).
- Only organizations with `reviewed_at` set have their events on the signed-out board, so the review step below also decides who appears there.
- Set `NEXT_PUBLIC_CONTACT_EMAIL` so "Report a broken link" goes to an inbox someone reads; without it, it falls back to `review@sycamore.app`.

For impact tracking (22 Nov 2026: visit counts, `?via=` share tags, "I applied" on listings, listing skills, the team's `/impact` page), run its migration **before** deploying the code, because sign-up now writes `volunteer.signup_via`. Then reload the listings so their skills (and the Taproot listing) land:

```bash
psql "$DATABASE_URL" -f db/migrations-impact.sql
DATABASE_URL="$DATABASE_URL" npm run db:seed-opportunities
```

- `/impact` shows visits, accounts, self-reported applications, verified skill areas, per-listing and per-tag numbers, plus CSV downloads. Seed and demo accounts (`.test` emails) are left out unless `?demo=1`.
- Share links: `/opportunities/<slug>?via=<tag>`. The page's link builder makes them.
- Nothing personal is counted: see the "Visit counts" and "I applied" lines on `/privacy`.

If port 5432 is blocked (venue Wi-Fi), run them through the same WebSocket route as `~/Canopy/CalHacks13/deploy/reseed-production.sh`.

Also run the hardening migration (12 Nov 2026; idempotent, builds its indexes without locking):

```bash
psql "$DATABASE_URL" -f db/migrations-hardening.sql
```

It marks the one record the home page may show (`record.featured`, the demo's), refuses a
check-in or walk-in into an event that is already verified, and adds the indexes the database
review found missing.

After migrating:
- **Existing organizations** keep PIN sign-in (`pin_enabled` defaults to true). Their owner links Google from **Account and team** and can then turn the PIN off.
- **Mark real organizations reviewed only after checking them:**

  ```sql
  update org set reviewed_at = now() where id = '…';
  ```

  Until then, their public records say "Attested by …" instead of "Verified".
- **Demo data on a real deployment:**
  - The seeded demo organizations use well-known PINs (246810 and three others). On a deployment real people use, either don't seed them, or turn the PINs off:

    ```sql
    update org set pin_enabled = false where coordinator_pin in ('246810','135790','864202','975318');
    ```

  - Also don't deploy the untracked `public/sim.html`, because it contains the demo PIN.

## 4. How sign-in works now

| Who | How | Notes |
|---|---|---|
| **Coordinator** | Google (OAuth code flow with PKCE, state and nonce) | The account owns or belongs to orgs (`org_member`). The owner adds coordinators by email in **Account and team**; they join on their first Google sign-in. |
| **Coordinator** | PIN, for the demo org and orgs set up before Google | 8 tries per 15 minutes per IP, and 300 misses per hour site-wide. Turning the PIN off ends every PIN session. |
| **Volunteer** | Google | A new Google volunteer adds a birth date and consent on `/join`. |
| **Volunteer** | 6-digit emailed code | 10 minutes, 5 tries, 4 sends per 15 minutes per address. The send step answers the same way whether or not the email has an account. |
| **Walk-ins** | Google or the short form | An existing account found by email and birth date is checked in but not signed in: that pair isn't proof of owning it. |

**Sessions** are random 256-bit tokens in an httpOnly, Secure, SameSite=Lax cookie (`sm_org`, `sm_vol`). Only the SHA-256 is stored, in `auth_session`. Signing out deletes the row. The first verified sign-in (Google or code) to an account that was created unverified ends every other session on it.

## 5. Security hardening in this branch

- Security headers on every response:
  - a Content Security Policy pinned to self, Google Identity and OpenStreetMap, with `frame-ancestors 'none'`
  - HSTS, nosniff, Referrer-Policy and Permissions-Policy (camera, mic and location limited to self)
  - no `X-Powered-By`
- Rate limits (Postgres-backed, so they hold across serverless instances) on:
  - sign-in, codes, join, walk-in, check-in and code lookups
  - org setup and invites
  - the opportunities board's outbound redirect (30 counted clicks per address per hour; the redirect itself always works)
  - every route that calls a model: per org per day, per IP per hour, and a site-wide daily ceiling
- SSRF filter: IPv4-mapped, NAT64 and 6to4 IPv6 forms are now checked as the IPv4 address they contain.
- CSV export: cells that would run as spreadsheet formulas are prefixed with a quote.
- `?next=` redirects: control characters and backslashes are rejected, and the result must resolve to this site.
- iCal export: a bare carriage return is escaped.
- Media responses send nosniff.
- An org can only mark its own event chats read.

## 6. Known gaps (not done)

- **Media quota:** uploads are capped per file (300 MB video, 50 MB audio) and story uploads per address per hour, but there's no per-org storage quota yet.
- **Orphaned uploads:** a video that reached Blob but whose page was closed before the clip was saved stays in the store. A sweep that lists `story/` and deletes blobs no row points to (older than a day) would clear them.
- **The CSP allows inline scripts**, because pages are prerendered and there's no per-request nonce. Moving to nonces means dynamic rendering for every page.
- **SSRF:** DNS rebinding between the address check and the fetch is still possible. A connect-time lookup through an undici `Agent` would close it. Impact on Vercel is low.
- **Background jobs:** only the daily sweep. Supervisor reminders are sent by the volunteer (at most twice, two days apart).
- **Organization review is a manual SQL step.** There's no admin screen yet.
- **Public listings are managed from a file.** `db/opportunities.json` plus `npm run db:seed-opportunities`; hiding one is a SQL update. Links are checked by hand (`verified_on`), not by a job, so a listing can go stale until someone re-checks it.
- **No automated test** covers the Google callback against real Google. It was checked with a placeholder client: the redirect, PKCE, state, nonce, and the tampered-state rejection.

## 7. Media storage (Vercel Blob), 20 Nov 2026

Story videos, voice notes and posters used to be written to the function's local disk, which Vercel throws away, and a video had to pass through a function whose request body stops at 4.5 MB. Both are fixed once a Blob store is connected:

1. Vercel → Storage → **Create** → **Blob**, access **Private**, and connect it to this project (all environments). That sets `BLOB_READ_WRITE_TOKEN`.
2. Redeploy.

What happens then:
- **Videos and voice notes** go straight from the coordinator's browser to the private store (`@vercel/blob/client`), with a ten-minute token from `/api/org/events/<id>/story/upload`. The token only allows that event's folder (`story/<event id>/`), the kind's file types, and its size cap. Our server then checks the finished upload again (`adoptDirectUpload`: our store, that folder, type, size) before saving the row, and deletes it if it doesn't pass.
- **Reads** still go through `/api/media/...`, which checks who is asking and streams the file from the private store. Range requests pass through, so Safari can seek in a video. The blob URL and token never reach a browser.
- **Deleting** a clip or note deletes the blob.
- Rows saved before the switch keep their bare file names and still read from disk (in production those files are already gone).

Without the token (local development) nothing changes: files go to `.media/`.

## 8. Health, clean-up and checks, 20 Nov 2026

- **`/api/health`**: 200 `{ ok, db, db_ms, commit }` when the database answers, 503 when it doesn't. Point an uptime monitor at it (UptimeRobot and Better Stack both have free tiers).
- **Daily sweep:** `vercel.json` runs `/api/cron/sweep` at 10:17 UTC. It deletes expired sessions, pending Google sign-ins, used sign-in codes and rate-limit rows older than a day (one row per address that ever tried). Needs `CRON_SECRET`.
- **Error pages:** `error.tsx` and `global-error.tsx` replace Next's bare error screen and show the digest Next logs next to the real error, so a support report can be matched to the log.
- **SEO and install:** `robots.txt` keeps crawlers off the app and personal links (records, transcripts, walk-in and guardian tokens); `sitemap.xml` lists the public pages; `manifest.webmanifest` lets a volunteer add SycaMore to their home screen, opening on `/me`.
- **CI** (`.github/workflows/ci.yml`) on every PR: types, lint and tests; a production build against a seeded Postgres; gitleaks over the whole history; `npm audit` on runtime dependencies.
- **Locally:** `npm run scan` runs gitleaks and the audit. Semgrep (`semgrep scan --config p/nextjs --config p/react --config p/owasp-top-ten src`) and an OWASP ZAP baseline (`docker run --rm ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t <url>`) were run on 20 Nov 2026; see the PR for results.
