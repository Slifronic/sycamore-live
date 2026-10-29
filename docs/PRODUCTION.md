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

Run both. Each is idempotent and safe on the live database:

```bash
psql "$DATABASE_URL" -f db/migrations-auth.sql
psql "$DATABASE_URL" -f db/migrations-transcript.sql
```

If port 5432 is blocked (venue Wi-Fi), run them through the same WebSocket route as `~/Canopy/CalHacks13/deploy/reseed-production.sh`.

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
  - every route that calls a model: per org per day, per IP per hour, and a site-wide daily ceiling
- SSRF filter: IPv4-mapped, NAT64 and 6to4 IPv6 forms are now checked as the IPv4 address they contain.
- CSV export: cells that would run as spreadsheet formulas are prefixed with a quote.
- `?next=` redirects: control characters and backslashes are rejected, and the result must resolve to this site.
- iCal export: a bare carriage return is escaped.
- Media responses send nosniff.
- An org can only mark its own event chats read.

## 6. Known gaps (not done)

- **Media storage:** story clips and voice notes write to local disk (`.media`), which is ephemeral on Vercel. Move them to Vercel Blob or S3 with signed uploads, size and type checks, and a per-org quota.
- **The CSP allows inline scripts**, because pages are prerendered and there's no per-request nonce. Moving to nonces means dynamic rendering for every page.
- **SSRF:** DNS rebinding between the address check and the fetch is still possible. A connect-time lookup through an undici `Agent` would close it. Impact on Vercel is low.
- **Background jobs:** there are none. Supervisor reminders are sent by the volunteer (at most twice, two days apart), and expired sessions and codes are swept during sign-ins.
- **Organization review is a manual SQL step.** There's no admin screen yet.
- **No automated test** covers the Google callback against real Google. It was checked with a placeholder client: the redirect, PKCE, state, nonce, and the tampered-state rejection.
