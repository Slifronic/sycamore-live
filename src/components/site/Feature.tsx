import type { ReactNode } from 'react';
import { Reveal, RevealGroup } from './Reveal';
import s from './feature.module.css';

// A text-and-picture row for the sub-pages. Rows alternate sides on wide
// screens and stack (text first) on phones.

export function FeatureRow({
  id,
  eyebrow,
  title,
  children,
  art,
  flip,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  art: ReactNode;
  flip?: boolean;
}) {
  return (
    <section className={`${s.row} ${flip ? s.flip : ''}`} id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <Reveal className={s.text}>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h3 className={s.title} id={id ? `${id}-title` : undefined}>
          {title}
        </h3>
        <div className={s.body}>{children}</div>
      </Reveal>
      <Reveal className={s.art} delay={90}>
        {art}
      </Reveal>
    </section>
  );
}

/** Bulleted facts with a small sap marker. */
export function Facts({ items }: { items: ReactNode[] }) {
  return (
    <ul className={s.facts}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function CardGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <RevealGroup className={`${s.grid} ${s[`cols${cols}`]}`} step={70}>
      {children}
    </RevealGroup>
  );
}

export function MiniCard({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <article className={s.mini}>
      {icon}
      <h3 className={s.miniTitle}>{title}</h3>
      <div className={s.miniBody}>{children}</div>
    </article>
  );
}

/** A sticky row of in-page jump links. */
export function JumpNav({ label, links, className }: { label: string; links: { href: string; label: string }[]; className?: string }) {
  return (
    <nav aria-label={label} className={`${s.jump} ${className ?? ''}`}>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
