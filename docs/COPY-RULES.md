# Copy rules for the marketing site (Oct 29, 2026)

These come from a benchmark of concise product sites (Linear, Stripe, Vercel, Notion, Raycast, Calendly, Luma, Airbnb hosts) and the volunteer and credential sites SycaMore competes with (Golden, POINT, Givebutter, Credly, Accredible). The research behind them, from Nielsen Norman Group: concise copy scored 58% higher on usability, and concise, scannable and objective copy together scored 124% higher. Readers get through about 20–28% of a page's words.

Before this pass the site had about 7,300 words: Home 2,032, Volunteers 1,075, Trust 985, Organizations 883, How it works 874, FAQ 647, Pricing 469, About 321.

## Word budgets

| Element | Max words |
|---|---|
| Hero headline | 8 |
| Hero subhead | 18 (aim 12–15) |
| Eyebrow | 3 |
| Section headline | 8 |
| Section body | 25 |
| Card body | 12 |
| Bullet or chip | 4 |
| Step caption | 8, plus a 1–3 word step label |
| Stat label | 8 |
| FAQ answer (inside an accordion) | 40 |
| Home page, visible text (closed accordions excluded) | ~700, across 7–9 sections |
| Inner page, visible text | ~400 (How it works and Trust ~450) |

## Say it once

Each claim lives on one page. Other pages link to it in one line.

| Topic | Owner page | Elsewhere |
|---|---|---|
| The volunteer journey (7 steps) | Home (the pinned scroll piece) | Volunteers: a 4-step chip row, then a link |
| The coordinator path (set-up, day, verify, report) | Organizations | Home: one line and a link |
| "Evidence from the day, not a signature after the fact" | Trust | Home: 3 annotations on the sample record. Organizations: one line |
| Minors and safety rules | Trust | Volunteers: a 3-chip summary and a link |
| Pricing detail | Pricing | Home: one line in the final CTA |
| Long answers | FAQ (accordion) | Elsewhere: a link to the question |

## Techniques to reach for

1. **Show the product instead of describing it.** Annotate the sample record or a UI mock rather than writing a paragraph.
2. **Turn three sentences into three chips** of 1–4 words each.
3. **Use label + one-line pairs** ("Verify — Hours arrive pre-filled.").
4. **Use a stat band**: number plus a label of 8 words or fewer, instead of claims. Use only real numbers from the product or the seed data, marked as demo where they are.
5. **Make the subhead a twist, not a restatement.** It has to add something the headline didn't say.
6. **Put depth behind expanders**: `<details>`, tabs or "Learn more →".
7. **Start parallel headlines and bullets with verbs.**
8. **Answer friction in one line** ("Free for volunteers. No card to start.").
9. **The coordinator owns the home page.** Volunteers get one card and their own page; reviewers get a "Check a record" link.

## Cut on sight (one-line tests)

- **The same noun phrase introduces the same feature in two sections.** Merge the sections.
- **Delete the headline: does the subhead still say something new?** If not, cut the subhead.
- **More than one comma-joined list in a sentence.** Split it, or turn it into chips.
- **A "we" sentence.** Make "you" or the product the subject.
- **An adjective a number could replace.** Use the number.
- **More than 3 answers visible without a click.** Put them in an accordion.
- **More than one primary CTA verb on a screen.** Keep one.
- **A paragraph longer than 2 lines on desktop.** Cut it in half.

## What must survive

- **Every fact that keeps the record honest:**
  - an organization attests the hours, never the volunteer
  - every changed hour needs a reason
  - verified rows are locked
  - a record can be revoked, and the page shows it
  - no location is stored
  - AI drafts, a person decides
- **The rules for under-18s:**
  - under 13 can't join
  - a guardian approves sharing
  - announcements only, no direct messages
- **The three paths:** coordinators, volunteers, and people checking a record.
- **Legal pages** (privacy, terms, data, licenses) are out of scope. Don't trim them.
