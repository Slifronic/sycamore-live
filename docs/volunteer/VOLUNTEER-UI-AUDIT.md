# Volunteer UI: what the prototype showed, and what runs now

Khanh's static volunteer prototype (`sycamore-volunteer-preview/`, in git history at `c169374`) mapped the team's volunteer brief and walkthrough video onto screens with fictional data. Every screen is now ported into the app on the organization side's theme (tokens, Fraunces headings, components in `src/app/globals.css`; the shell in `src/app/(vol)/layout.tsx`). This replaces the prototype's `docs/VOLUNTEER-UI-AUDIT.md`.

## Source precedence

The weekend shared contract (`build/00-SHARED-CONTRACT.md`) governs integration; the organization additions define `badge_award` and the four badge keys in `src/lib/badges.ts`. Older badge names from the walkthrough video (Outreach Strategist, Consultant) are not contract keys and aren't shown.

## Coverage

| Feature | Prototype | Now |
|---|---|---|
| Join, age gate | Form, under-13 refusal | `/join`, server validation, existing email needs its birth date |
| Check-in / out | Simulated timer | `/checkin` with the event code or QR; live session card; server timestamps |
| My hours | Sample records | Attested records only, pending shown without a number, private goal ring |
| Record and share | Sample link | `/me/records/[id]`, random `SYC-` codes, public `/v/<code>`, 403 for minors |
| Badges | Sample portfolio, signed / in progress / locked filters | `/me/badges`: signed = a `badge_award` row; progress and "ready for sign-off" computed per organization from attested attendance with the targets in `badges.ts` |
| Badge detail and certificate | Sample award, invented "48-hour review hold" | `/me/badges/[key]`: signer, date, evidence note, attested events and hours with the issuer, the rule, printable certificate. The review hold is gone: there is no such rule in the product |
| Badge verification | Not built | Public `/v/b/<code>` (`BDG-XXXX-XXXX`), made on request, 403 for minors |
| Journey | Illustrative sample timeline | `/me/journey`: attested events (practice excluded), roles, hours, running total, firsts, and badge signings |
| LinkedIn post | Editable "[Demo preview]" text | Editable post with the real verification link, Copy, and LinkedIn's share URL. Adults only, signed badges only, after the link exists. Nothing is posted automatically; no partnership is claimed |
| LinkedIn profile fields | Demo credential fields | Name, issuer, issue date, credential ID and URL to copy, plus LinkedIn's add-certification form |
| AI wording | Template preview | `POST /api/vol/records/:id/blurb`: OpenAI if configured, else Claude, else a template; code rejects any number not in the record |
| Discover | Fictional fixtures, saved IDs in localStorage | Real upcoming public events, ported engine, saved list on the server. See `DISCOVER.md` |
| Leave-the-area check | Not built | Opt-in toggle on the active session, only when the coordinator set a site; no coordinates stored |
| Guardian controls | UI-only share restrictions | UI and server: minors can't share records or badges and don't see LinkedIn; the blurb stays available (it's private) |
| Desktop and phone | Preview switch | One top bar on desktop with the tabs as a sliding pill; on phones a greeting bar and four bottom tabs (Home, Discover, Messages, Me), with Check in in the bar. Light and dark themes |
| Join consent | Not built | Required "I agree to the Terms and Privacy Policy" at `/join` and walk-in; 13 to 17 also confirm a parent or guardian knows (`terms_accepted_at`, `guardian_ack_at`) |
| My hours by organization | Not built | Home shows each organization as a folder of its records |
| Account | Not built | `/me/account`: theme, announcements opt-in (off by default), Download my data (JSON), Delete my account |

## Deliberately not built

No automatic LinkedIn posting, LinkedIn import, or partnership. No event registration or "I'm going": volunteers walk up and check in. No live routing or travel cost. No leaderboard, rarity or prestige score. Guardian consent is outside the weekend scope, so minors' sharing stays off.

## Verification (Oct 24, 2026)

Headless Chromium (Playwright 1.64) at 375 and 1440 wide on every volunteer page: no horizontal scroll, no overlapping elements, no console errors. Functional checks as `ana@example.test` (badges from real rows, public badge link in a cookie-free context, Discover re-ranking and saving across reload, blurb numbers) and `jay@example.test`, 16 (no share, no LinkedIn, 403s from the API, blurb allowed). Real iOS Safari and Android Chrome still need a pass.
