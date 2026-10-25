import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Staggered entrance for a page's regions: each direct child rises 6px and
 * fades in, 50ms after the one before (320ms, ease-out). CSS only (.stagger in
 * globals.css): content is visible without JavaScript, nothing waits on it, and
 * reduced motion shows everything at once. Use it on the 2–5 top-level regions
 * of a page, not on every list row.
 *
 *   <Stagger className="page">
 *     <PageHeader … />
 *     <section>…</section>
 *     <section>…</section>
 *   </Stagger>
 *
 * When the regions aren't direct children, mark them with <StaggerItem index={n}>.
 */
export function Stagger({ as: As = 'div', className = '', children, ...rest }: { as?: ElementType; className?: string; children: ReactNode } & Record<string, unknown>) {
  return (
    <As className={`stagger ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function StaggerItem({ as: As = 'div', index = 0, className = '', style, children, ...rest }: { as?: ElementType; index?: number; className?: string; style?: CSSProperties; children: ReactNode } & Record<string, unknown>) {
  return (
    <As className={`stagger-item ${className}`} style={{ ...style, ['--i' as string]: index }} {...rest}>
      {children}
    </As>
  );
}
