import type { ReactNode } from 'react';
import { Icon, type IconName } from '../shell/icons';
import s from './ui.module.css';

/**
 * An empty list says what to do next: an icon, one line, and the action.
 * (media/EmptyState is the illustrated version for bigger, friendlier spots.)
 *
 *   <EmptyState icon="calendar" title="No events yet" action={<Link className="btn btn-primary" href="/org/events/new">New event</Link>} />
 */
export function EmptyState({ icon, title, hint, action, compact = false, className = '' }: { icon: IconName; title: ReactNode; hint?: ReactNode; action?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={`${s.empty} ${className}`} data-compact={compact || undefined}>
      <span className={s.emptyIcon} aria-hidden>
        <Icon name={icon} size={20} />
      </span>
      <p className={s.emptyTitle}>{title}</p>
      {hint && <p className={s.emptyHint}>{hint}</p>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}
