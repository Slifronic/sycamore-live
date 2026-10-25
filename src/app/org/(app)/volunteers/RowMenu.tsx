'use client';

import { Menu } from '@/components/ui/Popover';
import { Icon, type IconName } from '@/components/shell/icons';
import s from './volunteers.module.css';

/** Phones: a row's actions (Invite back, Hour letter…) behind one ⋯ button. */
export function RowMenu({ name, items }: { name: string; items: { label: string; href: string; icon: IconName }[] }) {
  if (items.length === 0) return null;
  return (
    <Menu
      label={`Actions for ${name}`}
      placement="bottom-end"
      items={items}
      trigger={(p) => (
        <button {...p} type="button" className={s.rowMenu} aria-label={`Actions for ${name}`}>
          <Icon name="more" size={20} />
        </button>
      )}
    />
  );
}
