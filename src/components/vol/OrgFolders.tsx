'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Icon } from '../shell/icons';
import type { OrgColor } from './org-color';
import s from './folders.module.css';

// "Your organizations": each organization is a frosted folder, and its
// attested records are the papers inside. Hover (or press and hold on a
// phone) lifts the papers a few pixels; a tap opens the folder and the record
// cards fan out below it, each linking to its record. It's a disclosure: the
// folder is a button with aria-expanded, Escape closes it, and reduced motion
// shows the list with no fan. CSS transforms and one motion list, nothing
// heavier, so it stays smooth on a phone.

export type FolderRecord = {
  id: string;
  title: string;
  month: string; // "OCT"
  day: string; // "5"
  when: string; // "Oct 5, 2026"
  role: string;
  hours: string; // "3" or "2.5"
  revoked: boolean;
  shared: boolean;
  adjusted: boolean;
};

export type Folder = {
  orgId: string;
  name: string;
  initials: string;
  color: OrgColor;
  hours: string;
  hoursLabel: string; // "12 verified hours"
  count: number;
  since: string; // "Since Aug 2026"
  records: FolderRecord[];
};

const HOLD_MS = 280;

export function OrgFolders({ folders }: { folders: Folder[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const hold = useRef<{ t: ReturnType<typeof setTimeout> | null; fired: boolean }>({ t: null, fired: false });
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const close = useCallback(() => {
    setOpen((id) => {
      if (id) buttons.current.get(id)?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const endHold = () => {
    if (hold.current.t) clearTimeout(hold.current.t);
    hold.current.t = null;
    if (hold.current.fired) setTimeout(() => setPeek(null), 420);
  };

  return (
    <div className={s.grid}>
      {folders.map((f) => {
        const isOpen = open === f.orgId;
        const papers = f.records.slice(0, 3).reverse(); // back to front; the newest sits in front
        const regionId = `folder-${f.orgId}`;
        return (
          <Fragment key={f.orgId}>
            <div className={`${s.wrap} tag-${f.color}`} data-open={isOpen || undefined} data-peek={peek === f.orgId || undefined}>
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(f.orgId, el);
                  else buttons.current.delete(f.orgId);
                }}
                className={s.folder}
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={() => {
                  if (hold.current.fired) {
                    hold.current.fired = false;
                    return;
                  }
                  setOpen(isOpen ? null : f.orgId);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType !== 'touch') return;
                  hold.current.fired = false;
                  hold.current.t = setTimeout(() => {
                    hold.current.fired = true;
                    setPeek(f.orgId);
                    navigator.vibrate?.(8);
                  }, HOLD_MS);
                }}
                onPointerUp={endHold}
                onPointerCancel={endHold}
                onPointerLeave={endHold}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className={s.back} aria-hidden />
                <span className={s.papers} aria-hidden>
                  {papers.map((r, i) => (
                    <span key={r.id} className={`${s.paper} force-light`} data-i={papers.length - 1 - i}>
                      <span className={s.paperTitle}>{r.title}</span>
                      <span className={s.paperMeta}>
                        {r.month} {r.day} · {r.hours} h
                      </span>
                      <span className={s.paperLines} />
                    </span>
                  ))}
                </span>
                <span className={s.front}>
                  <span className={s.tile} aria-hidden>
                    {f.initials}
                  </span>
                  <span className={s.name}>{f.name}</span>
                  <span className={s.chev} aria-hidden>
                    <Icon name="chevron-down" size={16} />
                  </span>
                  <span className={s.meta}>
                    {f.count} {f.count === 1 ? 'record' : 'records'} · {f.since}
                  </span>
                  <span className={s.hours}>
                    <span aria-hidden>
                      {f.hours}
                      <span className={s.unit}>h</span>
                    </span>
                    <span className="sr-only">, {f.hoursLabel}</span>
                  </span>
                </span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.section
                  key="region"
                  id={regionId}
                  className={s.region}
                  aria-label={`Records from ${f.name}`}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.14 } }}
                >
                  <ul className={s.list}>
                    {f.records.map((r, i) => (
                      <motion.li
                        key={r.id}
                        initial={reduce ? false : { opacity: 0, y: -44 - Math.min(i, 4) * 10, rotate: (i % 2 ? 1 : -1) * (3 + (i % 3)), scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, delay: Math.min(i, 8) * 0.045 }}
                      >
                        <Link href={`/me/records/${r.id}`} className={`${s.rec} hover-lift tag-${f.color}`}>
                          <span className={s.date} aria-hidden>
                            <span>{r.month}</span>
                            <b>{r.day}</b>
                          </span>
                          <span className={s.recBody}>
                            <span className={s.recTitle}>{r.title}</span>
                            <span className={s.recMeta}>
                              <span className="sr-only">{r.when} · </span>
                              {r.role}
                              {r.adjusted ? ' · adjusted' : ''}
                              {r.revoked ? ' · revoked' : r.shared ? ' · shared' : ''}
                            </span>
                          </span>
                          <span className={s.recHours}>
                            {r.hours}
                            <span className={s.unit}>h</span>
                          </span>
                          <Icon name="chevron-right" size={16} className={s.recChev} />
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>
          </Fragment>
        );
      })}
      <Link href="/discover" className={s.ghost}>
        <span className={s.ghostIcon} aria-hidden>
          <Icon name="plus" size={20} />
        </span>
        <span className={s.ghostTitle}>Serve somewhere new</span>
        <span className={s.ghostHint}>Find an upcoming event on Discover</span>
      </Link>
    </div>
  );
}
