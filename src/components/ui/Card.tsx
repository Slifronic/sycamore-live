import Link from 'next/link';
import type { ElementType, ReactNode } from 'react';
import s from './ui.module.css';

/**
 * White paper on parchment: the global .card (ring + soft shadow, 14px radius).
 * With `href` it becomes a link card that lifts on hover. `pad` adds the
 * standard 20px padding.
 *
 *   <Card pad>…</Card>
 *   <Card href={`/org/events/${id}`} pad>…</Card>
 *   <Card as="section" aria-labelledby="h">…</Card>
 */
export function Card({
  as: As = 'div',
  href,
  pad = false,
  className = '',
  children,
  ...rest
}: { as?: ElementType; href?: string; pad?: boolean; className?: string; children: ReactNode } & Record<string, unknown>) {
  const cls = `card ${pad ? 'card-pad' : ''} ${href ? 'hover-lift' : ''} ${className}`;
  if (href)
    return (
      <Link href={href} className={cls} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }} {...rest}>
        {children}
      </Link>
    );
  return (
    <As className={cls} {...rest}>
      {children}
    </As>
  );
}

/** The head row of a card: optional eyebrow, a title, one action on the right. */
export function CardHeader({ eyebrow, title, action, id, className = '' }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={`${s.cardHead} ${className}`}>
      <div className={s.cardHeadText}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
