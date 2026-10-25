import type { ReactNode } from 'react';
import s from './ui.module.css';

/**
 * A short label beside a control, shown on hover (after ~300ms) and at once on
 * keyboard focus. CSS only, so it works in server components. The label is
 * aria-hidden: give the control its own accessible name (IconButton does).
 *
 *   <Tooltip label="Events" side="right"><Link aria-label="Events" …/></Tooltip>
 */
export function Tooltip({ label, side = 'top', children, className = '' }: { label: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactNode; className?: string }) {
  return (
    <span className={`${s.tip} ${className}`} data-side={side}>
      {children}
      <span className={s.tipLabel} aria-hidden>
        {label}
      </span>
    </span>
  );
}
