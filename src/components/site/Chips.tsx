import type { ReactNode } from 'react';
import { Icon, type IconName } from '../shell/icons';
import { TextLink } from './Blocks';
import { Reveal, RevealGroup } from './Reveal';
import s from './chips.module.css';

// Short-copy building blocks (docs/COPY-RULES.md): chips instead of
// sentences, a numbered step row instead of a walkthrough, label + one-line
// pairs instead of feature cards, and an expander for the depth. All server
// components; motion is CSS only and every piece is fully visible at rest.

export type Chip = { label: string; icon?: IconName; tone?: 'yes' | 'no' };

/** A row of 1–4 word chips. */
export function Chips({ items, className }: { items: (string | Chip)[]; className?: string }) {
  return (
    <ul className={`${s.chips} ${className ?? ''}`}>
      {items.map((it) => {
        const c = typeof it === 'string' ? { label: it } : it;
        const icon = c.icon ?? (c.tone === 'no' ? 'x' : 'check');
        return (
          <li key={c.label} className={c.tone === 'no' ? s.no : undefined}>
            <Icon name={icon} size={16} />
            {c.label}
          </li>
        );
      })}
    </ul>
  );
}

export type StepChip = { label: string; text: string; icon: IconName };

/** Numbered steps on one rule: a 1–3 word label and a caption of 8 words or fewer. */
export function StepChips({ steps }: { steps: StepChip[] }) {
  return (
    <RevealGroup as="ol" className={s.steps} itemAs="li" itemClassName={s.step} step={70}>
      {steps.map((st, i) => (
        <div key={st.label} className={s.stepInner}>
          <span className={s.badge} aria-hidden="true">
            <Icon name={st.icon} size={20} />
          </span>
          <p className={s.stepLabel}>
            <span className={s.n}>{String(i + 1).padStart(2, '0')}</span>
            {st.label}
          </p>
          <p className={s.stepText}>{st.text}</p>
        </div>
      ))}
    </RevealGroup>
  );
}

/** Label + one-line pairs ("Verify: Hours arrive pre-filled."). */
export function Pairs({ items }: { items: { label: string; text: ReactNode; icon?: IconName }[] }) {
  return (
    <dl className={s.pairs}>
      {items.map((it) => (
        <div key={it.label}>
          <dt>
            {it.icon && <Icon name={it.icon} size={18} />}
            {it.label}
          </dt>
          <dd>{it.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Depth behind a click: a native <details>, so it works without JavaScript. */
export function More({ summary = 'More detail', children, className }: { summary?: string; children: ReactNode; className?: string }) {
  return (
    <details className={`${s.more} ${className ?? ''}`}>
      <summary>
        <span>{summary}</span>
        <span className={s.plus} aria-hidden="true" />
      </summary>
      <div className={s.moreBody}>{children}</div>
    </details>
  );
}

/** A compact band: eyebrow and headline on one side, chips (and an optional
    link or expander) on the other. For short claims that don't need a section. */
export function ChipBand({ eyebrow, title, items, action, children, id }: { eyebrow: string; title: ReactNode; items: (string | Chip)[]; action?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <Reveal className={s.band}>
      <div className={s.bandHead}>
        <p className={s.bandEyebrow}>{eyebrow}</p>
        <h2 className={s.bandTitle} id={id}>
          {title}
        </h2>
      </div>
      <div className={s.bandBody}>
        <Chips items={items} />
        {action}
        {children}
      </div>
    </Reveal>
  );
}

/** One line that points to the page that owns a claim. */
export function ProofLine({ children, href, link, icon = 'shield' }: { children: ReactNode; href: string; link: string; icon?: IconName }) {
  return (
    <Reveal className={s.proof}>
      <span className={s.proofIcon} aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <p>{children}</p>
      <TextLink href={href}>{link}</TextLink>
    </Reveal>
  );
}
