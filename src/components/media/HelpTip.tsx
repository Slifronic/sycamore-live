'use client';

import type { ReactNode } from 'react';
import { Popover } from '../ui/Popover';
import { Icon } from '../shell/icons';
import s from './media.module.css';

/**
 * A small "?" button that opens a short help note, so working screens don't
 * carry paragraphs of explanation. Usable from server components (no
 * function props).
 *
 *   <HelpTip label="How badges work">A badge counts once you sign it…</HelpTip>
 */
export function HelpTip({ label, children, placement = 'bottom-start', more }: { label: string; children: ReactNode; placement?: 'bottom-start' | 'bottom-end'; more?: { href: string; label: string } }) {
  return (
    <Popover
      label={label}
      placement={placement}
      panelClassName={s.helpPanel}
      trigger={(p) => (
        <button type="button" className={s.helpBtn} aria-label={label} {...p}>
          <Icon name="help" size={16} />
        </button>
      )}
    >
      <p className={s.helpTitle}>{label}</p>
      <div className={s.helpBody}>{children}</div>
      {more && (
        <a className={s.helpMore} href={more.href}>
          {more.label} <Icon name="arrow-right" size={14} />
        </a>
      )}
    </Popover>
  );
}
