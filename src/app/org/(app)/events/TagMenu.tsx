'use client';

import { Menu } from '@/components/ui/Popover';
import { Icon } from '@/components/shell/icons';
import l from './list.module.css';

/** "Tag: All ▾" — filters the list (and the calendar) by one event tag. */
export function TagMenu({ current, items }: { current: string | null; items: { label: string; href: string; count: number; color: string; on: boolean }[] }) {
  return (
    <Menu
      label="Filter by tag"
      placement="bottom-start"
      trigger={(p) => (
        <button type="button" className={`btn btn-sm ${l.tagBtn}`} {...p}>
          <Icon name="list" size={16} />
          {current ? (
            <>
              Tag: <strong>{current}</strong>
            </>
          ) : (
            'All tags'
          )}
          <Icon name="chevron-down" size={14} />
        </button>
      )}
      items={items.map((it) => ({
        href: it.href,
        current: it.on,
        label: it.color ? <span className={`tag tag-${it.color}`}>{it.label}</span> : it.label,
        meta: it.count || undefined,
      }))}
    />
  );
}
