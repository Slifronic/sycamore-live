# SycaMore Live (Cal Hacks 13.0)

Volunteer hours recorded as the event happens, from the organization's side. Volunteers scan in and out; the coordinator verifies the event when it closes; every volunteer gets a record anyone can check.

Started at Cal Hacks 13.0 on Oct 23, 2026. SycaMore is the team's existing student project; this repo is a new weekend build on the same problem and shares no code with it.

This repo holds the **organization side** (Bryant, built with Claude). The volunteer side (check-in on phones, "My hours", the public `/v/` page) plugs into the same database and API, per `build/00-SHARED-CONTRACT.md` in the team's Drive hub.

## What the organization side does

- **Start in a minute:** four boxes, then a practice event and a 7-minute course that teaches by doing. Each lesson opens the real screen and completes itself when the coordinator does the action.
- **Events:** create one in under a minute; on the day, a full-screen QR code and a live roster (polls every 3 s). "Add by name" for people without phones.
- **Import paper sheet (Claude):** photograph a sign-in sheet; `claude-opus-5-5` drafts rows with structured outputs; low-confidence rows are amber; nothing is saved until the coordinator confirms each row. Sheet text is treated as data, not instructions, and the model never invents a check-out time.
- **Verify in two minutes:** hours pre-filled from scans, role dropdowns, standout stars, one tap to fill in people who didn't scan out (with a printed reason), flags for shifts over 8 hours and duplicate names, and a 30-second post-event check. Any changed hour requires a reason; a database trigger makes attested rows read-only.
- **SycaMore Index:** retention × 0.35 + coordinator efficiency × 0.30 + event completion × 0.35, all computed from app data, with the formula shown and the one thing that would raise each part. Tiers: Platinum 90, Gold 75, Silver 60, Bronze 45.
- **Volunteers:** first-timers, regulars, and "slipping away" (came twice, gone 30+ days) with a ready-to-send invite email.
- **Hour letter:** a printable letter per volunteer with the fields schools ask for (org and coordinator contact, each event's date, role and hours, adjustment reasons, verification dates, signature line). Replaces hand-signed hour letters.
- **Badges:** the system finds who meets a rule; a coordinator signs each one (with an evidence note where the badge asks for one).
- **Funder report:** hours, unique volunteers, events, value of volunteer time (Independent Sector 2025, preliminary: $36.14 national, $41.75 California), leadership, Index; print to PDF or download CSV.
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

## Run it

Needs Node 22+ and PostgreSQL 16/17 running locally.

```bash
npm install
cp .env.example .env.local   # or create it: see below
npm run db:reset             # creates sycamore_live and loads the demo seed
npm run dev -- -p 3311
```

`.env.local`:

```
DATABASE_URL=postgres://localhost:5432/sycamore_live
NEXT_PUBLIC_APP_URL=http://localhost:3311
ANTHROPIC_API_KEY=...        # for "Import paper sheet" and "Event story"
```

Demo coordinator PIN: **246810** (Riverside Restoration Crew, made-up names). The seed mirrors the shape of the team's real pilot: four planting events with 45/48/52/58 attendances at 3 hours each. Phase 2 is left unverified on purpose: verifying it on stage moves the Index from Silver to Gold and makes new badges ready.

## Checks

```bash
npm run check   # tsc + eslint
```

## Paper-sheet import accuracy

`npm run eval:sheets` (dev server running, `ANTHROPIC_API_KEY` set) scores the import on three fake handwritten sheets in `tests/sheets/` (regenerate them with `make_sheets.py`). Last run, Oct 23, 2026, `claude-opus-5-5`: **19 of 19 rows exactly right before review**, the ink-blotted time flagged instead of guessed, the crossed-out row and the "IGNORE PREVIOUS INSTRUCTIONS" line both skipped and mentioned in notes, and blank time-outs left empty. About 5 to 9 seconds per sheet.
