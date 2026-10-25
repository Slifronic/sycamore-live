'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Segmented } from '../Segmented';
import { PinReveal } from '../PinReveal';
import { Icon } from './icons';
import { SECTION_VIEWS } from './org-nav';
import { openCommandPalette } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { SLOT_ID } from './TopBarSlot';
import { Menu, Popover } from '../ui/Popover';
import { Tooltip } from '../ui/Tooltip';
import u from '../ui/ui.module.css';
import s from './shell.module.css';

export type Waiting = { id: string; title: string; ended: string };

/**
 * The coordinator's top bar (the Vessa layout): org tile and name; the
 * section's sub-view switcher; search (⌘K); the bell with events waiting to be
 * verified; "+ New"; and the avatar with a Pacific-time greeting, which opens
 * the account panel (PIN, theme, sign out).
 */
export function OrgTopBar({
  org,
  me,
  greeting,
  waiting,
  waitingCount,
  badgesReady,
  importHref,
  viewCounts,
  signOut,
}: {
  org: { name: string; initials: string; kind: string };
  me: { name: string; first: string; initials: string; pin: string };
  greeting: string;
  waiting: Waiting[];
  waitingCount: number;
  badgesReady: number;
  importHref: string | null;
  viewCounts: { unread: number; chatUnread: number };
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const section = SECTION_VIEWS.find((v) => v.show(path));

  return (
    <header className={`${s.top} no-print`}>
      <Link href="/org" className={s.brand} aria-label={`${org.name}, home`}>
        <span className={s.tile} aria-hidden>
          {org.initials}
        </span>
        <span className={s.brandText}>
          <span className={s.orgName}>{org.name}</span>
          <span className={s.orgKind}>{org.kind}</span>
        </span>
      </Link>

      <div className={s.views}>
        {section && (
          <div className={s.configured}>
            <Segmented
              id={section.id}
              label={section.label}
              size="sm"
              items={section.items.map((it) => {
                const n = it.count ? viewCounts[it.count] : 0;
                return {
                  href: it.href,
                  on: it.match(path),
                  label: (
                    <>
                      {it.label}
                      {n > 0 && (
                        <b className={s.viewCount}>
                          {n}
                          <span className="sr-only"> unread</span>
                        </b>
                      )}
                    </>
                  ),
                };
              })}
            />
          </div>
        )}
        <div id={SLOT_ID} className={s.slot} />
      </div>

      <div className={s.actions}>
        <button type="button" className={s.search} onClick={() => openCommandPalette()} aria-label="Search events, volunteers and pages" aria-keyshortcuts="Meta+K Control+K /">
          <Icon name="search" size={16} />
          <span className={s.searchText}>Search</span>
          <span className={`kbd ${s.searchKbd}`}>⌘K</span>
        </button>

        <Popover
          label="Waiting for you"
          placement="bottom-end"
          panelClassName={s.bellPanel}
          trigger={(p) => (
            <Tooltip label="Waiting for you" side="bottom">
              <button {...p} type="button" className={u.iconBtn} aria-label={waitingCount > 0 ? `${waitingCount} ${waitingCount === 1 ? 'event' : 'events'} waiting to be verified` : 'Nothing waiting'}>
                <Icon name="bell" size={20} />
                {waitingCount > 0 && (
                  <span className={u.count} aria-hidden>
                    {waitingCount}
                  </span>
                )}
              </button>
            </Tooltip>
          )}
        >
          <div className={s.bellHead}>
            <p className={s.bellTitle}>Waiting for you</p>
            {waitingCount > 0 && <span className="chip chip-amber">{waitingCount} to verify</span>}
          </div>
          {waiting.length === 0 ? (
            <p className={s.bellEmpty}>Nothing to verify. Events land here when they end.</p>
          ) : (
            <ul className={s.bellList}>
              {waiting.map((w) => (
                <li key={w.id}>
                  <Link href={`/org/events/${w.id}/verify`} className={s.bellItem}>
                    <span className={s.bellDot} aria-hidden />
                    <span className={s.bellText}>
                      <span className={s.bellEvent}>{w.title}</span>
                      <span className={s.bellMeta}>Ended {w.ended}</span>
                    </span>
                    <span className={s.bellGo}>Verify</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {waitingCount > waiting.length && (
            <Link href="/org/events" className={s.bellMore}>
              See all {waitingCount}
            </Link>
          )}
          {badgesReady > 0 && (
            <Link href="/org/badges" className={s.bellMore}>
              {badgesReady} {badgesReady === 1 ? 'badge' : 'badges'} ready to sign
            </Link>
          )}
        </Popover>

        <Menu
          label="Create"
          placement="bottom-end"
          panelClassName={s.newMenu}
          items={[
            { label: 'New event', hint: 'Schedule it, get a check-in code', href: '/org/events/new', icon: 'calendar-plus' },
            { label: 'Broadcast', hint: 'Message everyone who signed up', href: '/org/messages/broadcasts', icon: 'megaphone' },
            ...(importHref ? [{ label: 'Import paper sheet', hint: 'Photo of a sign-in sheet', href: importHref, icon: 'clipboard' as const }] : []),
          ]}
          trigger={(p) => (
            <button {...p} type="button" className={`btn btn-primary ${s.newBtn}`} aria-label="New">
              <Icon name="plus" size={16} strokeWidth={2} />
              <span className={s.newText}>New</span>
            </button>
          )}
        />

        <Popover
          label="Account"
          placement="bottom-end"
          panelClassName={s.accountPanel}
          trigger={(p) => (
            <button {...p} type="button" className={s.me} aria-label={`Account: ${me.name}`}>
              <span className={s.avatar} aria-hidden>
                {me.initials}
              </span>
              <span className={s.meText} aria-hidden>
                <span className={s.greet}>{greeting}</span>
                <span className={s.meName}>{me.name}</span>
              </span>
              <Icon name="chevron-down" size={16} className={s.meChev} />
            </button>
          )}
        >
          <div className={s.accountHead}>
            <span className={s.avatar} aria-hidden>
              {me.initials}
            </span>
            <div className={s.accountText}>
              <p className={s.accountName}>{me.name}</p>
              <p className={s.accountOrg}>
                Coordinator · {org.name}
              </p>
            </div>
          </div>
          <div className={s.accountRow}>
            <Icon name="key" size={16} className={s.accountIcon} />
            <PinReveal pin={me.pin} />
          </div>
          <ThemeToggle variant="row" className={s.accountTheme} />
          <Link href="/org/learn" className={s.accountLink}>
            <Icon name="book" size={16} /> Learn SycaMore
          </Link>
          <form action={signOut}>
            <button className={s.accountLink} data-tone="danger">
              <Icon name="logout" size={16} /> Sign out
            </button>
          </form>
        </Popover>
      </div>
    </header>
  );
}
