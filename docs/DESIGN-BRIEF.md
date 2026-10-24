# Organization dashboard: design brief

The reference is the team's refined pitch walkthrough (`Canopy/SycaMore/dashboard/sycamore-walkthrough-refined.html`, org dashboard slides) and the earlier SycaMore design system: a botanical field journal for verified service. Not dashboards v8/v9 (older palette).

## The one job per screen

| Screen | Primary job | Rank-1 element |
|---|---|---|
| Home | Show what needs the coordinator now | "Needs you" cards, then the observed facts (verified hours, attendances, unique volunteers, events verified within 24 hours) |
| Event day | Get people checked in | The QR code and the live roster |
| Verify | Confirm hours quickly and correctly | The roster rows and the Verify & close bar |
| Index (hidden until Phase 4: 30 orgs, 200 events) | Explain the score and the next move | The score ring and the weakest part; not linked from anywhere |
| Report | Hand a funder proof | The report sheet itself |

## Rules

1. **Colour is information.** Green means verified, butter means needs you, blush means a problem. The primary action is ink, never a colour. One live green (sap) for eyebrows, focus and the live dot.
2. **Paper on parchment.** Cards are white paper lifted off a warm parchment page with a faint grain; rings, not borders, define edges.
3. **Fraunces carries numbers.** Every metric is a Fraunces numeral with tabular figures; labels are small uppercase Jakarta.
4. **Motion is rationed.** Working surfaces get count-ups, the Index ring filling, input bars, a sliding nav pill and hover lift. The check-in and verify paths never wait on an animation. After verifying, the screen lists what is now on the record (hours added, attendances, volunteers, events verified within 24 hours); no score or tier is shown. Everything respects `prefers-reduced-motion`.

## Tokens (from the walkthrough's refined theme)

| Token | Value | Use |
|---|---|---|
| parchment | #f7f6f1 | page |
| paper | #ffffff | cards |
| ink | #0f261b | text, primary buttons |
| canopy | #1b4632 | headings, numbers |
| bark / lichen / field | #55665b / #5f6d64 / #878579 | secondary text, captions, table heads |
| rule / rule-soft | #e2e0d6 / #edebe3 | lines |
| sap / sap-deep | #2c8a57 / #1f6e45 | live accent, focus, eyebrows |
| meadow / meadow-ink | #d9efe0 / #155030 | verified |
| butter / butter-ink | #f9eecd / #6b4c07 | needs you, Gold |
| blush / blush-ink | #f8e0dd / #8a2b21 | problem |
| lift | 0 1px 1px rgba(15,38,27,.03), 0 10px 24px -14px rgba(15,38,27,.16), 0 0 0 1px rgba(15,38,27,.055) | cards |
| lift-hi | adds 0 30px 60px -24px rgba(15,38,27,.28) | hover |
| radius | 14px cards, 999px pills | |
| ease / out | cubic-bezier(.25,.6,.3,1) / cubic-bezier(.16,1,.3,1) | all motion |

Type: display numbers 44/1, -0.03em; h1 30, -0.02em; h2 21, -0.015em; h3 17; body 15/1.55; micro-label 11px 700 uppercase 0.09em in bark.

## Signature pieces

- **Index gauge:** a 270° ring (track dasharray 311 of 415, rotated 135°), gradient #6fbf90 → #1b4632, score in Fraunces inside, three 7px input bars beneath.
- **KPI row:** micro-label, Fraunces number, one quiet line of context; the "waiting" number turns butter-ink.
- **Event rows:** 1.5px rule-soft border; the waiting row gets a butter wash and a "Needs verification" chip.
- **Org tile:** a gradient initials tile (canopy) next to the org name.
- **Sliding nav pill** behind the active nav item.

## Motion values

- Count-ups: easeOutCubic, 900 ms for KPIs, 1.4 s for the Index; start from the true value when reduced motion is on.
- Ring fill: stroke-dasharray transition 1.6 s, `out` easing.
- Input bars: 1.2 s each, staggered 150 ms + 160 ms × index.
- Hover lift: translateY(-2px) cards, -1px buttons, 160 to 200 ms.
- Nav pill: spring (stiffness 380, damping 32).
- Verify celebration: old score to new over 1.4 s; tier chip pulse 1.6 s once.

## Ideas taken from the Instagram reference (code.xr reel, light dashboards)

The reel itself has no in-UI motion; these are layout ideas only, translated into SycaMore's palette.

- One saturated hero band: the four headline numbers sit on a canopy gradient band (linear-gradient(150deg, #215a3d, #0f261b)) with parchment text and a sparkline each. Everything else stays paper on parchment.
- A chart card with a hover value pill: hours per verified event as rounded bars.
- One dark contrast panel: "Happening now" becomes an ink panel with the live dot, the check-in code and the head count.
- Muted secondary figures ("/ 100", units) at ~60% size in a lighter tone.
- Fat pill progress bars with the percentage inside, for the course and "almost there" badges.
- Grouped sidebar navigation with small section labels.

## Round 2 decisions (design critique + accessibility audit)

- One page header everywhere (`PageHeader`): eyebrow, title, a lede capped at 62ch, the action on the right. Page width is `--page-max` (1160px).
- Butter is for Gold/Platinum and "needs you" only. Silver and Bronze use the neutral `chip-silver`.
- Choices among a few options are segmented controls (`Segmented`) whose white pill slides (spring 380/32). Only the page's main action is ink.
- The check-in path holds still: new roster rows get a static sap marker until the next poll (no flash), no hover lifts, and the headcount doesn't tick. The full-screen QR is a native modal `<dialog>`.
- Verify: the goal question sits above the table; every blocker in the sticky bar is a button that jumps to the control that fixes it.
- Count-ups keep the true value for screen readers and print; the gauge and bars fill only once on screen; bars animate `scaleX`, not width.
- Text tokens pass WCAG AA: `--field` is #6f6d63, focus rings are 2px `--primary`, and controls are at least 44px on touch screens.

## Messages (from the @_code_and_chill_ "customer messaging dashboard" reel)

Translated from a shop's customer inbox to a coordinator and their volunteers, in SycaMore's palette.

- **Inbox as list beside conversation:** initials avatar, name, one-line preview, a channel line, a red unread count. The open thread gets a moss wash and a sap edge. Incoming bubbles are white paper; outgoing are ink, canopy for broadcasts and a deep violet for automations, with a small uppercase label saying which.
- **"N new" rule** in blush above the first unread reply, and "Delivered / Read 7:40 PM" receipts under outgoing messages.
- **Campaign funnel:** fat rounded bars (Sent, Read, Replied, then Showed up in gold, the one SycaMore-specific step) with the count and percent right-aligned in tabular figures, beside a phone mock showing a real delivered copy.
- **Automation flows** as a vertical chain of white step cards joined by a 2px rule: Trigger (blush ring), Wait, Send, Then, ending in an "End of flow" pill. The settings sit in the left half of the same card.
- Not taken: channel mixing (WhatsApp/SMS/email). Everything stays in the app, so there's no phone number to collect.
