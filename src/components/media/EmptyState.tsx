import Image from 'next/image';
import type { ReactNode } from 'react';
import { illoSrc, type Illo } from '@/lib/covers';
import s from './media.module.css';

// An empty list is a place to start, not a dead end: a small botanical
// drawing, one line on why it's empty, and the next thing to do.
export function EmptyState({
  illo,
  title,
  children,
  action,
  compact = false,
  className = '',
}: {
  illo: Illo;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`${s.empty} ${compact ? s.emptyCompact : ''} ${className}`}>
      <div className={s.illo} aria-hidden>
        <Image src={illoSrc(illo)} alt="" fill sizes="120px" className={s.illoImg} />
      </div>
      <div className={s.emptyText}>
        <p className={s.emptyTitle}>{title}</p>
        {children && <p className={s.emptyBody}>{children}</p>}
        {action && <div className={s.emptyAction}>{action}</div>}
      </div>
    </div>
  );
}
