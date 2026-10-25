# UI kit (round 1 foundation, Oct 25, 2026)

What the shells, primitives and motion pieces are, and how to use them. Read `REDESIGN-2026-10-25.md` for the why; this file is the how. Everything here works in light and dark, and respects reduced motion on its own.

## Rules of thumb

- Colours come from tokens in `globals.css`, never hex. If you need a colour that isn't a token, add a token for both themes.
- Icons come from `shell/icons.tsx` only. No emoji as icons.
- One primary (ink) action per screen. At most three primary regions above the fold.
- Content is visible without JavaScript. Animation only ever goes *to* the visible state.

## Tokens

| Token | Use |
| --- | --- |
| `--parchment`, `--paper`, `--surface-2` | page, cards, quiet wells (rail, segmented track) |
| `--ink`, `--ink-2`, `--ink-3`, `--field` | text, from strongest to faintest |
| `--canopy` | headings and numbers |
| `--primary`, `--sap` | focus, eyebrows, the live dot |
| `--primary-soft` | the active pill (rail, tab bars, palette row) |
| `--verified(-soft)`, `--amber(-soft)`, `--red(-soft)` | verified, needs you, problem |
| `--line`, `--line-2`, `--rule-soft` | rules |
| `--shadow`, `--shadow-hi`, `--pop` | card, hovered card, floating panel (rings in dark) |
| `--on-ink` | text on an ink button. **Never hard-code `#fff` on `var(--ink)`**: ink is light in dark mode |
| `--ink-panel`, `--on-ink-panel` | a dark contrast panel ("Happening now", the site footer). Stays dark in both themes |
| `--hover`, `--wash` | row hover on paper; hover tint for ghost controls |
| `--chip-neutral`, `--skel`, `--glass`, `--scrim` | neutral chip, skeleton block, sticky bars, modal backdrop |
| `--dur-1/2/3` (120/200/320ms), `--ease-out`, `--ease-inout` | motion. Spring for pills: `SPRING` in `motion/tokens.ts` (380/32) |

Dark theme: `:root[data-theme='dark']` redefines every token. Add `.force-light` to a surface that must read as paper in dark mode (a certificate, a QR card). `.paper-sheet` already does this.

**If your page uses `background: var(--ink); color: #fff` for a dark panel, switch to `var(--ink-panel)` / `var(--on-ink-panel)`.** Also replace hard-coded `#fff` card backgrounds with `var(--paper)`, and light washes such as `#fbfaf6` with `var(--hover)`.

## Theme

- `shell/theme.ts`: `setTheme('dark' | 'light', originEl?)`, `toggleTheme(originEl?)`, `currentTheme()`, `subscribeTheme(cb)`. The choice is stored in localStorage (`sycamore-theme`); `<ThemeScript>` (`shell/ThemeScript.tsx`, in the root layout) applies it before first paint, also on client-rendered 404 shells.
- `<ThemeToggle variant="icon" | "row" | "inline" tooltip="right" />` (`shell/ThemeToggle.tsx`). The circular wipe grows from the button you pressed. Under reduced motion, or without the View Transitions API, the swap is instant.

## Coordinator shell (`app/org/(app)/layout.tsx`)

The top bar, the rail and the phone tab bar come from the layout, so pages render only their content.

- **Navigation map**: `shell/org-nav.ts`. `RAIL`, `MORE`, `TABS`, `TAB_MORE`, `PAGES` (the palette's page list) and `SECTION_VIEWS`. Add a page here and it shows up in the rail, the tab bar and ⌘K.
- **Sub-view switcher**: `SECTION_VIEWS` puts a small pill `Segmented` in the top bar on the paths where it applies (Events: List / Calendar; Messages: Inbox / Event chats / Broadcasts / Automations). **Remove the duplicate tabs from your page** (for example `MessagesTabs`, the "Calendar" button on Events). If a page needs its own data-driven control there, use `<TopBarSlot>{control}</TopBarSlot>` (`shell/TopBarSlot.tsx`). It replaces the default while the page is shown, but it appears only after hydration, so prefer `SECTION_VIEWS`.
- **Bell**: lists events that ended and are not verified (`/org/events/{id}/verify`), plus badges ready to sign.
- **+ New**: New event (`/org/events/new`), Broadcast (the composer, `/org/messages/broadcasts?new=1`), and Import paper sheet → `/org/events/{id}?import=1#import` (the live event, else the latest unverified one; the sheet import opens when `?import=1` is present). The palette's Actions group has the same three.
- **Avatar**: greeting in Pacific time; the account panel holds the masked PIN (`PinReveal`), theme, Learn and Sign out.
- **Command palette**: ⌘K / Ctrl+K or `/`. Use `openCommandPalette()` from `shell/CommandPalette.tsx` to open it from a button. The data comes from `GET /api/org/search`, scoped to the coordinator cookie.

There is no Settings page yet, so More holds Badges and Learn.

## Volunteer shell (`app/(vol)/layout.tsx`)

- Phones: a greeting bar (first name, Check in button, avatar) and a bottom tab bar: **Home** `/me`, **Discover** `/discover`, **Messages** `/me/messages`, **Me** `/me/account`.
- Desktop: one sticky top bar with the brand, the same four tabs as a sliding pill, Check in and the avatar, over a centred column (max 980px).
- The Me tab is active on `/me/account`, `/me/badges` and `/me/journey`. Home is active on `/me`, `/me/records/*` and `/checkin`.
- `/me/account` (titled Account) holds the name and email, the theme switch, the announcements opt-in (off until the volunteer turns it on), Download my data (JSON), Delete my account (type DELETE), links to Badges, Journey, Privacy, Terms and Deletion and retention (`/data`), and Sign out on this device.
- Sign out lives on `/me/account`; the shell has no sign-out button.

## PageHeader (`components/PageHeader.tsx`)

```tsx
<PageHeader
  eyebrow="Who came, and how often"
  title="Volunteers"
  lede="Optional. One line, 90 characters at most."
  controls={<Segmented id="range" size="sm" label="Range" items={…} />}
  action={<Link className="btn btn-primary" href="…">Export</Link>}
/>
```

`controls` takes one segmented control and `action` takes one action. The old `action` with several buttons still works.

## Segmented (`components/Segmented.tsx`)

`<Segmented id label items={[{ href, label, on }]} size="sm" | "md" vertical className="seg-tiles" />`. These are links, and the paper pill slides between them. `id` must be unique on the page. The track scrolls sideways rather than wrapping.

## UI primitives (`components/ui/`)

- **Card**: `<Card pad>…</Card>`, or `<Card href="…" pad>` for a link card that lifts on hover, or `<Card as="section">`. `<CardHeader eyebrow title action id />`.
- **StatCard**:
  ```tsx
  <StatCard label="Verified hours · 30 days" value={612} unit="hrs" decimals={0}
    delta={{ value: '+48', dir: 'up', tone: 'good', label: 'vs the 30 days before' }}
    icon="clock" iconTone="sap" | "butter" | "mist" | "blush" | "ink"
    spark={[…numbers]} /* or sparkSlot={<anything/>} */
    foot="Across 6 events" href="/org/reports" countUp />
  ```
  The number is in Fraunces and counts up once on screen. The sparkline draws in.
- **Chip**: `<Chip tone="green" | "amber" | "red" | "ink" | "gold" | "silver" icon="check">Verified</Chip>`. This is the same as the global `.chip .chip-*` classes.
- **IconButton**: `<IconButton icon="bell" label="Waiting" count={2} countTone="amber" | "red" | "green" countLabel="to verify" variant="ghost" | "paper" | "solid" size="sm" | "md" | "lg" tooltip="bottom" | false href? onClick? />`. `label` is both the accessible name and the tooltip.
- **Tooltip**: `<Tooltip label="Events" side="right">{control}</Tooltip>`. CSS only: it shows after about 300ms on hover and at once on keyboard focus. The label is `aria-hidden`, so the control needs its own name. Near the right edge of the screen, use `side="left"` so the hidden label doesn't widen the page.
- **Popover**: `<Popover label="Account" placement="bottom-end" trigger={(p) => <button {...p}>…</button>}>{(close) => …}</Popover>`. Focus moves in when it opens. Escape, a click outside, or following a link closes it.
- **Menu**: `<Menu label="Create" placement="bottom-end" | "bottom-start" | "top-end" | "top-start" | "right-end" | "right-start" trigger={(p) => <button {...p}>New</button>} items={[{ label, href | onSelect, icon, hint, meta, current, tone: 'danger' }, 'separator', { heading: 'More' }]} footer={…} />`. It handles ↑/↓, Home/End, Enter, Escape and Tab.
- **EmptyState**: `<EmptyState icon="calendar" title="No events yet" hint="One line." action={<Link className="btn btn-primary" …>New event</Link>} compact />`. `media/EmptyState` is the illustrated version, for friendlier spots.
- **Icons**: `<Icon name="calendar" size={16 | 20} />`. Names are listed in `shell/icons.tsx` (`ICON_NAMES`).

## Motion kit (`components/motion/`)

- **Stagger**: `<Stagger className="page">` on the 2 to 5 top-level regions of a page. Its direct children rise 6px and fade in, 50ms apart, over 320ms. For regions that are not direct children, use `<StaggerItem index={n}>`. This is CSS only, using `.stagger` and `.stagger-item` in `globals.css`. Don't use it on list rows or on the check-in or verify paths.
- **CountUp**: `<CountUp value={612} decimals={0} prefix suffix duration={0.9} />`. It counts once on screen, keeps the true value for screen readers and print, and shows the true value at once under reduced motion.
- **NumberRoll**: `<NumberRoll value={n} decimals prefix suffix className="figure" />`. Digits roll like an odometer when the value changes, and the first render doesn't move. Use it for totals that change while you watch, but not for the check-in headcount, which stays still (`LiveNumber` is the old roller; prefer NumberRoll).
- **Sparkline**: `<Sparkline points={[…]} width={96} height={30} area color delay className />`. It draws in once when it comes on screen, and it's fully visible without JavaScript.
- **Hover lift**: add `.hover-lift` to a card that is a link (pointer devices only). `Card href` and `StatCard href` already do this.
- **Route transitions**: `RouteTransition` (already in both shells) uses React `<ViewTransition>`. The old page fades out in 120ms and the new one rises in, with no setup needed. For shared-element morphs, see `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`.
- **Toasts**: `toast('Saved')`, `toast.success(title, { body, action: { label, onClick | href }, duration })`, `toast.warning`, `toast.error` (from `shell/Toast.tsx`, client components only). After a server redirect, render `<ToastOnMount message="Event saved" id="saved" />`. Toasts sit at the bottom, above the phone tab bars, and are announced politely (errors assertively).
- **Tokens for JS**: `motion/tokens.ts` exports `SPRING`, `INSTANT`, `DUR`, `EASE_OUT` and `EASE_INOUT`.

## Utilities in globals.css

`.kbd` (a key hint), `.hover-lift`, `.stagger`, `.force-light`, `.seg-sm`, `.page-head-side`, plus the existing `.btn*`, `.card*`, `.chip-*`, `.tag-*`, `.notice-*`, `.skel*`, `.figure`, `.eyebrow`.
