# SycaMore Live (Cal Hacks 13.0)

Volunteer hours recorded as the event happens, from the organization's side. Volunteers scan in and out; the coordinator verifies the event when it closes; every volunteer gets a record anyone can check.

Started at Cal Hacks 13.0 on Oct 23, 2026. SycaMore is the team's existing student project; this repo is a new weekend build on the same problem and shares no code with it.

This repo holds the **organization side** (Bryant, built with Claude). The volunteer side (check-in on phones, "My hours", the public `/v/` page) plugs into the same database and API, per `build/00-SHARED-CONTRACT.md` in the team's Drive hub.

## What the organization side does

- **Start in a minute:** four boxes, then a practice event and a 7-minute course that teaches by doing. Each lesson opens the real screen and completes itself when the coordinator does the action.
- **Events:** create one in under a minute; on the day, a full-screen QR code and a live roster (polls every 3 s). "Add by name" for people without phones.
- **Import paper sheet (Claude):** photograph a sign-in sheet; `claude-opus-5-5` drafts rows with structured outputs; low-confidence rows are amber; nothing is saved until the coordinator confirms each row. Sheet text is treated as data, not instructions, and the model never invents a check-out time.
- **Verify in two minutes:** hours pre-filled from scans, role dropdowns, standout stars, one tap to fill in people who didn't scan out (with a printed reason), flags for shifts over 8 hours and duplicate names, and a 30-second post-event check. Any changed hour requires a reason; a database trigger makes attested rows read-only.
- **Observed facts, no score:** the dashboard, the header, the verify screen and the funder report show counts straight from the data: verified hours, attendances, unique volunteers, and events verified within 24 hours of ending. The composite SycaMore Index and its tiers stay in the code (`src/lib/insights.ts`) but aren't shown or linked anywhere until the business model's Phase 4 trigger (30 organizations, 200 events); `/org/score` still renders for anyone who types the URL.
- **Volunteers:** first-timers, regulars, and "Haven't come in 30+ days" (came twice, each row a plain fact like "Last came 34 days ago") with a ready-to-send invite email.
- **Hour letter:** a printable letter per volunteer with the fields schools ask for (org and coordinator contact, each event's date, role and hours, adjustment reasons, verification dates, signature line). Replaces hand-signed hour letters.
- **Badges:** the system finds who meets a rule; a coordinator signs each one (with an evidence note where the badge asks for one).
- **Funder report:** hours, unique volunteers, events, value of volunteer time (Independent Sector 2025, preliminary: $36.14 national, $41.75 California), leadership, events verified within 24 hours of ending; print to PDF or download CSV.
- **Leave-the-area check (opt-in):** the coordinator sets the site and a radius on event day. A volunteer who opts in pings their location while the check-in page is open. After 10 minutes outside the circle, the roster shows "Left the area around 7:14 PM?", and the verify screen offers that time as their check-out with a printed reason. Nobody is checked out automatically, no coordinates are stored (only when they left and how far), vague GPS fixes are ignored, and verifying wipes it all. Logic in `src/lib/presence.ts`; the volunteer endpoint `POST /api/vol/presence` is a reference implementation for the volunteer side.
- **Walk-in sign-up:** for someone who just shows up with no account. Each event gets a second QR code, under the check-in code, in the full-screen view and on page 2 of the printed sign. Scanning it opens `/w/<token>`:
  - **Sign up:** "Continue with Google" (asks only for a birth date after) or name, email and birth date. It also checks them in to that event in the same step and sets the contract's `vid` cookie.
  - **Check-in screen:** a running timer and a Check out button. Reopening the link on the same phone brings it back, and someone who signed up on that phone before checks in with one tap.
  - **When it works:** from 2 hours before the start to 2 hours after the end, and never once the event is verified. The coordinator can turn it off or make a new link, which kills every photo or print of the old one. Even then, a walk-in who is still checked in can reach Check out from the old link.
  - **Roster:** walk-ins show as "Signed up at the door", with a "New" tag at the event where they joined.
  - **Rules:**
    - Under 13 is refused and nothing is stored.
    - Ages 13 to 17 are told that sharing will need a guardian's OK.
    - An email that's already signed up needs its matching birth date, so typing someone else's email doesn't open their record or messages.
    - Google ID tokens are verified with Google on the server (audience, issuer, expiry, verified email).
  - **Code:** logic in `src/lib/walkin.ts` and `src/lib/google.ts`. `POST /api/vol/checkout` is a reference implementation of the contract route for the volunteer side.
- **New event, from what you already have:** one box takes a paste or a dropped file and fills in the form. Nothing saves until the coordinator presses Create, and imported fields are tinted, with anything uncertain marked amber.
  - **Calendars, no sign-in:** an `.ics` invite or the invite email (`.eml`), a Google or Outlook "add to calendar" link, or a calendar's iCal address (Google's "secret address", Apple public calendars, Outlook ICS links). Feeds list the next four months, with repeating events expanded, and an event imported twice is flagged.
  - **Event pages:** Eventbrite, Meetup and most org sites are read from their schema.org data; other pages and any pasted message go to Claude.
  - **Claude:** a pasted group-chat message or email, or a photo of a flyer or screenshot (`claude-opus-5-5`, structured output). The server checks the date and time shapes, relative dates ("this Saturday") resolve against today, and instructions inside the material are ignored.
  - **Repeat a past event:** same place, hours, notes and tags, next week on the same weekday.
  - Pasted links are fetched only from public addresses, with redirects re-checked, a size cap and a timeout (`src/lib/safe-fetch.ts`).
- **Place picker:** search a park or address (OpenStreetMap, no API key), paste a Google or Apple Maps link (short links are expanded), or use the coordinator's location. The pin can also turn on the leave-the-area check.
- **Tags:** the org's own labels in six colours, created inline. Events and the calendar filter by them, and each tag has its own calendar feed.
- **Calendar:** a month view (an agenda list on phones) with subscribe links for Google, Apple and Outlook. The feed `/cal/<token>.ics` is unguessable and updates every few hours; practice events never appear in it.
- **Share with volunteers:** every event gets a public page `/e/<slug>` with a map, one-tap directions, add to Google / Apple / Outlook, notes and how check-in works. The check-in code is not on it. The event page has a ready-to-send announcement for group chats, with Share, Copy, WhatsApp, text, email and Telegram buttons.
- **Event story (Claude):** after an event, the coordinator records a voice debrief and adds phone videos.
  - **Voice:** a live transcript from the browser's speech service; the audio is kept privately.
  - **Videos:** the browser cuts a few still frames from each clip, and Claude describes them: what's happening, usable moments, a caption, and a flag when people or possibly minors are recognizable.
  - **Campaign:** Claude drafts it from the debrief, the clips and the event's verified facts: headline, story, pull quote, grant-report paragraph, thank-you, Instagram, LinkedIn and X posts, and a highlight-reel storyboard.
  - **Guard rails,** checked on the server for every draft and every edit:
    - Every number must appear in the attested record or in the coordinator's own words. Anything else is flagged and blocks publishing.
    - The pull quote must be verbatim from the debrief.
    - Only clips the coordinator marked as consented can be in the reel or served publicly.
    - Publishing needs a verified event.
  - **Publishing:** the campaign goes to `/c/<slug>`; voice notes stay private. Media is stored on local disk in `.media/` (gitignored; set `MEDIA_DIR` to change it).

## What the volunteer side does

Same app, same theme: the volunteer pages live in `src/app/(vol)/` with a shell that mirrors the coordinator's (sidebar on desktop, bottom tabs on phones).

- **`/join`:** name, email, birth date. Under 13 is refused and nothing is stored; 13 to 17 can join, but sharing needs a guardian's OK. An existing email signs back in only with its birth date. `?next=` brings them back (a QR scan lands on `/join?next=/checkin?code=…`).
- **`/checkin`:** the event QR (`/checkin?code=<checkin_code>`) or the 6 typed characters; check-in opens 2 hours before the start and closes 2 hours after the end, and practice events never match. Checked in, it's the live session card (shared with the walk-in page) with Check out. If the coordinator set a site, an off-by-default toggle, "Help {org} see if I leave early", sends `POST /api/vol/presence` pings while the page is open (no coordinates stored) and offers Check out if they've left.
- **`/me`:** attested hours, events and organizations; a private personal goal (`volunteer.hours_goal`, filled only by attested hours); pending events as "Waiting for {org} to confirm" with no number; one card per record.
- **`/me/records/[id]`:** the contract's record wording with captured vs adjusted and the reason, a share link (`SYC-XXXX-XXXX`, `crypto.randomInt`) with copy and QR, and print / save as PDF. Minors get "Sharing needs a guardian's OK", and the API returns 403.
- **Use this record (AI wording):** a resume line or a scholarship sentence from the record's org, event, date, role and hours only. OpenAI when `OPENAI_API_KEY` is set (`OPENAI_MODEL`, default `gpt-4o-mini`), else Claude through `src/lib/claude.ts`, else a template; structured JSON either way. `src/lib/blurb.ts` rejects any number, in digits or words, that isn't the hours, part of the date, or in the org or event name; it retries once, then uses the template. Editable, with Copy and "Hours from {org}'s attested record. The wording is AI-drafted; edit it before you use it." Minors can use it; nothing is shared.
- **`/me/badges`:** signed / in progress / not started. Signed means the organization signed a `badge_award` row; progress and "ready for sign-off" are computed per organization from attested attendance with the rule targets in `src/lib/badges.ts` (the org dashboard uses the same stats helpers). Pending check-ins and practice events never count.
- **`/me/badges/[key]`:** the certificate: signer, date, the coordinator's evidence note, attested events and hours with the issuer, the rule; print / save as PDF. Adults can create a public verification link (`/v/b/BDG-XXXX-XXXX`, `POST /api/vol/badges/:id/share`; minors get a 403, like records). With the link, **Add to LinkedIn**: an editable post with the link, Copy, LinkedIn's share URL, and the Licenses & certifications fields to copy. Nothing is posted for them, and there's no LinkedIn partnership.
- **`/me/journey`:** every attested event (practice excluded) with the role, hours, a running total, firsts, and the badges signed along the way.
- **`/discover`:** upcoming public events from every organization, ranked in the browser by Khanh's matching engine (ported unchanged to `src/lib/discover/`): use my experience / learn something new / follow my interests, a cause, skills to use and develop. Org tags supply the cause and skills; journey time, cost and support are unknown, so each score is the supported fit points with the range. Fit is rule-based, not a probability. Pasted resume or role text (`/discover/profile`) stays in page memory, never sent or stored. Save for later is per volunteer on the server (`saved_event`, `/api/vol/saved`). Each event links to its public page `/e/<slug>` and walk-up check-in; there's no sign-up. Details in `docs/volunteer/DISCOVER.md`.
- **`/v/<code>`:** public, no cookie, not indexed: VERIFIED or REVOKED, the wording, and who to call. Unknown codes are a 404.
- **`/me/messages`:** coordinator threads and event group chats, over the existing `/api/vol/messages` and `/api/vol/event-chats`. Volunteers under 18 get the organization's announcements (broadcasts and automatic notices) only: they aren't in event group chats (can't see members, read or post) and direct messages with a coordinator are off in both directions, with "Messages with volunteers under 18 are off" on both sides. The rule lives in the data layer (`src/lib/minors.ts`, used by `messages.ts`, `event-chat.ts` and the vol routes), which answer 403.
- **API:** `POST /api/vol/join`, `GET`/`PATCH /api/vol/me`, `POST /api/vol/checkin`, `GET /api/vol/records`, `POST /api/vol/records/:id/share`, `POST /api/vol/records/:id/blurb`, `POST /api/vol/badges/:id/share`, `GET`/`POST /api/vol/saved`, `GET /api/v/:code` (logic in `src/lib/vol-data.ts`, `vol-badges.ts`, `vol-discover.ts`, `blurb.ts`). The browser never sends hours.
- **Where it came from:** Khanh's static prototype (`sycamore-volunteer-preview/`) is fully ported and removed from the branch; it stays in git history at `c169374`. Its notes, updated for the integrated version, are in `docs/volunteer/`.

Demo volunteers: `ana@example.test` / 2007-04-12 (adult, three attested records, one pending, one already shared at `/v/SYC-RVR7-PLNT`, Event Coordination signed and Team Leadership ready for sign-off) and `jay@example.test` / 2010-02-03 (16, can't share). Three more made-up organizations (PINs 135790, 864202, 975318) have 8 upcoming events for Discover.

## Run it

Needs Node 22+ and PostgreSQL 16/17 running locally.

```bash
npm install
cp .env.example .env.local   # or create it: see below
npm run db:reset             # creates the database in DATABASE_URL and loads the demo seed
npm run dev -- -p 3311
```

`.env.local`:

```
DATABASE_URL=postgres://localhost:5432/sycamore_live
NEXT_PUBLIC_APP_URL=http://localhost:3311
ANTHROPIC_API_KEY=...        # for "Import paper sheet", "Event story" and the volunteer blurb
OPENAI_API_KEY=...           # optional: the blurb uses OpenAI instead of Claude when set
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com   # optional: "Continue with Google" for walk-ins
```

**Google sign-in for walk-ins (optional).** Without a client ID the walk-in page shows only the short form, which works on its own. To turn Google on:
1. Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
2. Under **Authorized JavaScript origins**, add every origin the app runs on, for example `http://localhost:3311` and the Vercel URL. No redirect URI is needed; there is no client secret to store.
3. Put the client ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (locally and in Vercel) and restart the server.

Demo coordinator PIN: **246810** (Riverside Restoration Crew, made-up names). The seed mirrors the shape of the team's real pilot: four planting events with 45/48/52/58 attendances at 3 hours each. Phase 2 is left unverified on purpose: verifying it on stage adds its hours to the record and makes new badges ready.

## Checks

```bash
npm run check   # tsc + eslint
npm test        # Discover engine (22 ported tests + 4) and the blurb number check; Node 22.18+ runs the TypeScript directly
```

## Paper-sheet import accuracy

`npm run eval:sheets` (dev server running, `ANTHROPIC_API_KEY` set) scores the import on three fake handwritten sheets in `tests/sheets/` (regenerate them with `make_sheets.py`). Last run, Oct 23, 2026, `claude-opus-5-5`: **19 of 19 rows exactly right before review**, the ink-blotted time flagged instead of guessed, the crossed-out row and the "IGNORE PREVIOUS INSTRUCTIONS" line both skipped and mentioned in notes, and blank time-outs left empty. About 5 to 9 seconds per sheet.
