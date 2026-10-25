'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, type IconName } from './icons';
import { PAGES } from './org-nav';
import { toggleTheme } from './theme';
import s from './palette.module.css';

/**
 * ⌘K / Ctrl+K (or "/" when not typing) opens a command palette: jump to a
 * page, an event (title and date) or a volunteer, or run an action. The index
 * loads once from /api/org/search, scoped to the signed-in org. ↑/↓ move,
 * Enter opens, Escape closes. Any button can open it with openCommandPalette().
 */

const OPEN_EVENT = 'sycamore:palette';
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Group = 'Actions' | 'Pages' | 'Events' | 'Volunteers';
type Entry = { id: string; group: Group; label: string; sub?: string; meta?: string; icon: IconName; initials?: string; href?: string; run?: () => void; keywords?: string; rank?: number };
type Index = {
  events: { id: string; title: string; starts_at: string; state: 'live' | 'waiting' | 'verified' | 'upcoming'; practice: boolean }[];
  volunteers: { key: string; name: string; events: number }[];
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const STATE_TEXT = { live: 'Live now', waiting: 'Needs verifying', verified: 'Verified', upcoming: 'Upcoming' } as const;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/** Fuzzy score: substring beats subsequence; word starts and runs score higher. null = no match. */
export function fuzzy(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at >= 0) return 1000 - at * 2 + (at === 0 || /\W/.test(t[at - 1]) ? 300 : 0) - t.length * 0.05;
  let from = 0;
  let last = -2;
  let score = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const j = t.indexOf(ch, from);
    if (j < 0) return null;
    score += (j === last + 1 ? 10 : 1) + (j === 0 || /\W/.test(t[j - 1]) ? 8 : 0);
    last = j;
    from = j + 1;
  }
  return score;
}

const isEditable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function CommandPalette({ importHref }: { importHref: string | null }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);

  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    fetch('/api/org/search', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Index) => setIndex(d))
      .catch(() => {
        setFailed(true);
        loading.current = false;
      });
  }, []);

  const show = useCallback(() => {
    setQ('');
    setActive(0);
    setOpen(true);
    load();
  }, [load]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.current?.open) setOpen(false);
        else show();
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target) && !dialog.current?.open) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, [show]);

  const entries = useMemo<Entry[]>(() => {
    const actions: Entry[] = [
      { id: 'a-new', group: 'Actions', label: 'New event', icon: 'calendar-plus', href: '/org/events/new', keywords: 'create add schedule' },
      { id: 'a-bc', group: 'Actions', label: 'Send a broadcast', icon: 'megaphone', href: '/org/messages/broadcasts', keywords: 'message everyone announce' },
      ...(importHref ? [{ id: 'a-imp', group: 'Actions' as const, label: 'Import a paper sheet', icon: 'clipboard' as const, href: importHref, keywords: 'photo sign-in sheet scan' }] : []),
      { id: 'a-theme', group: 'Actions', label: 'Switch light / dark theme', icon: 'moon', run: () => toggleTheme(), keywords: 'dark mode appearance' },
    ];
    const pages: Entry[] = PAGES.map((p) => ({ id: `p-${p.href}`, group: 'Pages', label: p.label, icon: p.icon, href: p.href, keywords: p.keywords }));
    const events: Entry[] = (index?.events ?? []).map((e, i) => ({
      id: `e-${e.id}`,
      group: 'Events',
      label: e.title,
      sub: day(e.starts_at) + (e.practice ? ' · Practice' : ''),
      meta: STATE_TEXT[e.state],
      icon: e.state === 'live' ? 'live' : 'calendar',
      href: e.state === 'waiting' ? `/org/events/${e.id}/verify` : `/org/events/${e.id}`,
      keywords: day(e.starts_at),
      rank: e.state === 'live' ? -2 : e.state === 'waiting' ? -1 : i,
    }));
    const people: Entry[] = (index?.volunteers ?? []).map((v) => ({
      id: `v-${v.key}`,
      group: 'Volunteers',
      label: v.name,
      meta: `${v.events} ${v.events === 1 ? 'event' : 'events'}`,
      icon: 'user',
      initials: initialsOf(v.name),
      href: `/org/volunteers?q=${encodeURIComponent(v.name)}`,
    }));
    return [...actions, ...pages, ...events, ...people];
  }, [index, importHref]);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) {
      // Nothing typed: actions, the main pages, and the events that need you first.
      const ev = entries.filter((e) => e.group === 'Events').sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).slice(0, 5);
      return [...entries.filter((e) => e.group === 'Actions'), ...entries.filter((e) => e.group === 'Pages').slice(0, 5), ...ev];
    }
    const cap: Record<Group, number> = { Actions: 4, Pages: 6, Events: 7, Volunteers: 7 };
    const scored = entries
      .map((e) => ({ e, sc: Math.max(fuzzy(query, e.label) ?? -1, e.keywords ? (fuzzy(query, e.keywords) ?? -1) * 0.6 : -1) }))
      // Drop scattered subsequence hits ("mar" in "dark mode appearance").
      .filter((x) => x.sc >= Math.min(900, query.length * 4))
      .sort((a, b) => b.sc - a.sc);
    const order: Group[] = ['Actions', 'Pages', 'Events', 'Volunteers'];
    // Groups in a stable order, each sorted by score; the best group first.
    const best = scored[0]?.e.group;
    const groups = best ? [best, ...order.filter((g) => g !== best)] : order;
    return groups.flatMap((g) => scored.filter((x) => x.e.group === g).slice(0, cap[g]).map((x) => x.e));
  }, [entries, q]);

  const current = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${current}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const choose = (e: Entry | undefined) => {
    if (!e) return;
    setOpen(false);
    if (e.run) e.run();
    else if (e.href) router.push(e.href);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((current - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[current]);
    } else if (e.key === 'Home' && e.ctrlKey) {
      setActive(0);
    }
  };

  let lastGroup: Group | null = null;
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label="Search and jump"
      onClose={() => setOpen(false)}
      onClick={(e) => {
        if (e.target === dialog.current) setOpen(false);
      }}
    >
      {open && (
        <div className={s.box}>
          <div className={s.inputRow}>
            <Icon name="search" size={20} className={s.searchIcon} />
            <input
              ref={input}
              className={s.input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              placeholder="Jump to an event, a volunteer or a page…"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={results[current] ? `${uid}-${current}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="kbd">esc</span>
          </div>
          <div ref={list} id={`${uid}-list`} role="listbox" aria-label="Results" className={s.list}>
            {results.map((e, i) => {
              const head = e.group !== lastGroup ? e.group : null;
              lastGroup = e.group;
              return (
                <div key={e.id} role="presentation">
                  {head && (
                    <p className={s.group} role="presentation">
                      {head}
                    </p>
                  )}
                  <div
                    id={`${uid}-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={i === current}
                    className={s.option}
                    onMouseMove={() => i !== current && setActive(i)}
                    onClick={() => choose(e)}
                  >
                    {e.initials ? (
                      <span className={s.optInitials} aria-hidden>
                        {e.initials}
                      </span>
                    ) : (
                      <span className={s.optIcon} data-live={e.icon === 'live' || undefined}>
                        <Icon name={e.icon} size={16} />
                      </span>
                    )}
                    <span className={s.optText}>
                      <span className={s.optLabel}>{e.label}</span>
                      {e.sub && <span className={s.optSub}>{e.sub}</span>}
                    </span>
                    {e.meta && (
                      <span className={s.optMeta} data-state={e.meta}>
                        {e.meta}
                      </span>
                    )}
                    <Icon name="enter" size={16} className={s.optEnter} />
                  </div>
                </div>
              );
            })}
            {results.length === 0 && (
              <div className={s.empty}>
                <p>No matches for “{q.trim()}”.</p>
                <p className="muted small">Try a first name, part of an event title, or a month like “Mar”.</p>
              </div>
            )}
            {!index && !failed && q.trim() && <p className={s.loading}>Loading events and volunteers…</p>}
            {failed && <p className={s.loading}>Couldn’t load events and volunteers. Pages and actions still work.</p>}
          </div>
          <div className={s.foot} aria-hidden>
            <span>
              <span className="kbd">↑</span>
              <span className="kbd">↓</span> move
            </span>
            <span>
              <span className="kbd">↵</span> open
            </span>
            <span>
              <span className="kbd">⌘K</span> toggle
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}
