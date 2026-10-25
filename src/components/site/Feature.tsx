import type { ReactNode } from 'react';
import { Icon, type IconName } from '../shell/icons';
import { Reveal, RevealGroup } from './Reveal';
import s from './feature.module.css';

// Building blocks for the sub-pages: a text-and-picture row, and a grid of
// small cards. Rows alternate sides on wide screens and stack on phones.

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
      <Reveal className={s.art} delay={60}>
        {art}
      </Reveal>
    </section>
  );
}

export function CardGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <RevealGroup className={`${s.grid} ${s[`cols${cols}`]}`} step={50}>
      {children}
    </RevealGroup>
  );
}

export function MiniCard({ icon, title, children }: { icon?: IconName; title: string; children: ReactNode }) {
  return (
    <article className={s.mini}>
      {icon && (
        <span className={s.miniIcon}>
          <Icon name={icon} size={20} />
        </span>
      )}
      <h3 className={s.miniTitle}>{title}</h3>
      <div className={s.miniBody}>{children}</div>
    </article>
  );
}

/** A plain art panel: a quiet well that holds a drawing at its natural size. */
export function ArtWell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${s.well} ${className ?? ''}`}>{children}</div>;
}

