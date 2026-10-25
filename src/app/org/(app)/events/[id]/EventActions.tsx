'use client';

import Link from 'next/link';
import { Menu, type MenuItem } from '@/components/ui/Popover';
import { Icon, type IconName } from '@/components/shell/icons';
import s from './event.module.css';

type Quick = { label: string; href: string; icon?: IconName; badge?: { text: string; tone: 'red' | 'quiet' } };

/**
 * The event's one action row, on the title line: quiet links (Chat ·
 * Announce · Edit), the page's primary when it has one, and a ⋯ menu for the
 * rare ones ("Close & verify early" while it runs, "Debrief" after).
 */
export function EventActions({ quick, primary, more }: { quick: Quick[]; primary?: { label: string; href: string; icon?: IconName; trailing?: boolean }; more: MenuItem[] }) {
  return (
    <div className={s.actions}>
      {quick.map((q) => (
        <Link key={q.href} className="btn btn-sm btn-quiet" href={q.href}>
          {q.icon && <Icon name={q.icon} size={16} />} {q.label}
          {q.badge && <span className={q.badge.tone === 'red' ? s.unread : s.count}>{q.badge.text}</span>}
        </Link>
      ))}
      {more.length > 0 && (
        <Menu
          label="More actions"
          placement="bottom-end"
          items={more}
          trigger={(p) => (
            <button {...p} type="button" className={`btn btn-sm btn-quiet ${s.moreBtn}`} aria-label="More actions">
              <Icon name="more" size={16} />
            </button>
          )}
        />
      )}
      {primary && (
        <Link className={`btn btn-primary ${s.primary}`} href={primary.href}>
          {primary.icon && !primary.trailing && <Icon name={primary.icon} size={16} />}
          {primary.label}
          {primary.icon && primary.trailing && <Icon name={primary.icon} size={16} />}
        </Link>
      )}
    </div>
  );
}
