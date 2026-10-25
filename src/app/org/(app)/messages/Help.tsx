'use client';

import type { ReactNode } from 'react';
import { Popover } from '@/components/ui/Popover';
import { Icon } from '@/components/shell/icons';
import s from './messages.module.css';

/**
 * A "?" beside a page title: the explanation that used to be a paragraph on
 * the page, one click away. Used by the Messages and Volunteers pages.
 */
export function Help({ label, children, placement = 'bottom-start' }: { label: string; children: ReactNode; placement?: 'bottom-start' | 'bottom-end' }) {
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
      <div className={s.helpBody}>{children}</div>
    </Popover>
  );
}
