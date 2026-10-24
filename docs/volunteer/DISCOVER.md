# Discover: student-directed recommendations

Khanh's Discover prototype, integrated into SycaMore Live. The static prototype it came from (`sycamore-volunteer-preview/`) is in git history at `c169374`; this file replaces its `docs/DISCOVER.md` and describes what runs now.

## What it does

- `/discover`: upcoming public events from every organization on SycaMore, ranked for the volunteer. Three modes (use my experience, learn something new, follow my interests), a cause preference, skills to use and skills to develop, and optional filters for contribution area, format and day. Changing any of them re-ranks the list immediately, in the browser. Tabs: For you, Browse all, Saved. "Not for me" hides a listing until the volunteer restores it.
- `/discover/profile`: paste role descriptions (or open a `.txt`/`.md` file up to 200 KB), get suggested skills per role with the sentence each came from, edit or remove them, add roles by hand, and confirm the review. Only reviewed roles count.
- `/discover/<slug>`: one event, organization first, then the notes for volunteers, the skills it offers, when and where, and "Your fit, explained" with a donut, two short reasons, Save, and a collapsed table of all nine criteria.
- **Save for later** is kept per volunteer on the server (`saved_event`, `GET`/`POST /api/vol/saved`). Only the event id is stored.
- **No sign-up step.** Each listing links to the event's public page `/e/<slug>` (map, directions, add to calendar) and explains walk-up check-in: scan the QR code or type the 6-character code at the sign-in table, and the organization confirms hours afterwards.

## Where the listings come from

`src/lib/vol-discover.ts` loads events that are not practice events, not verified, open, and not over yet, with their organization and tags. `src/lib/discover/listings.ts` maps each one into the engine's listing shape. Only what the database knows goes in:

| Engine field | Source |
|---|---|
| day, time, weeks | `starts_at` / `ends_at` in Pacific time; every event is one event (`weeks = 1`) |
| format | in person (events happen at a place; check-in is at the sign-in table) |
| cause | the first org tag that names a cause (`Education & Youth`, or an alias like `Food access`), else `Environment & Conservation` for planting events, else none |
| practice skills, area | org tags that name a taxonomy skill (`Tutoring`, `Inventory`…), plus the event's activity (planting, logistics, outreach, teaching); the area is the skill group most of them fall in |
| required skills | none: organizations don't list prerequisites, so none are assumed |
| travel time, travel cost | **unknown** (`null`): we don't know where the volunteer starts |
| training & support rating | **unknown** (`null`): organizations don't list it yet |

Unknown criteria contribute `0` to the supported score and their full weight to the upper bound, so every card shows "N fit points supported so far · up to M once details are known", and every listing's status is "Details to confirm". Nothing is invented to make the number look better.

The demo seed (`db/seed-discover.mjs`) adds three made-up organizations with 8 upcoming events tagged across the taxonomy (Education & Youth, Food Access & Nutrition, Community Development, Arts & Culture), next to Riverside's two upcoming events.

## Engine

`src/lib/discover/engine.ts`, `taxonomy.ts` and `match.ts` are line-for-line TypeScript ports of the prototype's `engine.js`, `taxonomy.js` and `match-v2.js`. The scoring logic, the nine criteria and the weights are unchanged:

- experience 25/15/5/15/10/10/10/5/5, learn 20/0/5/25/20/10/10/5/5, interests 35/0/0/20/15/10/10/5/5 (current goal, direct experience, transferable experience, learning opportunity, training & support, schedule, travel feasibility, commitment, cause alignment).
- Contribution = weight × rating / 5. Unknown ratings give an interval `[low, high]`. Sorting uses the supported lower bound, then the listing id.
- Unreviewed experience is unknown, not zero; a reviewed empty profile is an explicit zero. "Any day" and "any cause" get a neutral 3/5. Cause is a preference; format and day are filters. No prestige, major, badge count or hours total enters the score.

Before the prototype was removed, the port was checked against the original JavaScript on 52,002 profile × listing combinations (17,010 for the original evaluator, 34,992 for the taxonomy evaluator, plus `extractRoles`): identical statuses, reasons, components, bounds and sort scores.

`npm test` runs the prototype's 22 tests, ported to `tests/discover/engine.test.ts` and `taxonomy.test.ts` against the prototype's fictional fixtures (`tests/discover/fixtures.ts`, never shown in the app), plus 4 tests for the listing mapping (`listings.test.ts`). Node runs the TypeScript directly (`node --test`, type stripping, Node 22.18+).

## Honest boundaries

- Fit points are a rule-based comparison with unvalidated weights, not a probability of being accepted or of enjoying the event. The UI says so next to the score and in "How these recommendations work".
- Skill suggestions come from a small keyword dictionary, not AI, and can be wrong; the volunteer reviews every one. Reviewed statements are self-reported, not proof of proficiency.
- **Resume and role text stay in page memory.** They live in a React context in `src/app/(vol)/discover/DiscoverState.tsx`, are never in a request body, never written to storage, and clear on reload. The same goes for preferences. The Playwright check confirms no request carries the pasted text.
- A LinkedIn profile URL is not imported or scraped; the volunteer pastes experience text instead. PDF and Word are not read.
- Journey time, travel cost, training and support are unknown until organizations can list them; the travel limits the engine needs are fixed at the prototype's defaults and exclude nothing today.

## Research basis

The design adapts public principles, not proprietary formulas (from the prototype's notes): LinkedIn's recommended-jobs help page, Eightfold's matching write-up, Workday HiredScore Fit & Gap, Gloat's talent marketplace, Google re:Work structured-interview rubrics, and JLL on commuting.
