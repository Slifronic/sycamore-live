import Image from 'next/image';
import { illo, type IlloName } from './media';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '../shell/icons';
import { Rays } from './Rays';
import { Reveal } from './Reveal';
import s from './site.module.css';

// Server building blocks shared by every marketing page. One rhythm
// everywhere: eyebrow, title, a one-line lede, then the content.

/** A title whose lines rise out of a mask on load (hero-entrance.md). Visible at rest. */
export function RiseTitle({ lines, className, as: As = 'h1', id }: { lines: ReactNode[]; className?: string; as?: 'h1' | 'h2'; id?: string }) {
  return (
    <As className={className ?? s.pageTitle} id={id}>
      {lines.map((l, i) => (
        <span key={i} className={s.ln}>
          <span style={{ ['--i' as string]: i }}>{l}</span>{' '}
        </span>
      ))}
    </As>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
  art,
  ambient,
}: {
  eyebrow: string;
  title: ReactNode[];
  lede?: ReactNode;
  children?: ReactNode;
  art?: ReactNode;
  /** The drifting rays backdrop (animated-rays port). */
  ambient?: boolean;
}) {
  return (
    <section className={`${s.pageHero} ${ambient ? s.ambient : ''}`} aria-labelledby="page-title">
      {ambient && <Rays />}
      <div className={`${s.wrap} ${art ? s.pageHeroGrid : ''}`}>
        <div className={s.pageHeroText}>
          <p className={`${s.eyebrow} ${s.fade}`}>{eyebrow}</p>
          <RiseTitle lines={title} id="page-title" />
          {lede && (
            <p className={`${s.lede} ${s.fade}`} style={{ ['--d' as string]: '0.28s' }}>
              {lede}
            </p>
          )}
          {children && (
            <div className={`${s.heroExtra} ${s.fade}`} style={{ ['--d' as string]: '0.38s' }}>
              {children}
            </div>
          )}
        </div>
        {art && (
          <div className={`${s.pageHeroArt} ${s.fade}`} style={{ ['--d' as string]: '0.2s' }}>
            {art}
          </div>
        )}
      </div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  id,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className={`${s.head} ${action ? s.headRow : ''}`}>
      <div className={s.headText}>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h2 className={s.h2} id={id}>
          {title}
        </h2>
        {lede && <p className={s.lede}>{lede}</p>}
      </div>
      {action}
    </Reveal>
  );
}

/** A page section with the standard head. `well` sets it on the quiet surface. */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  action,
  well,
  children,
  label,
}: {
  id: string;
  eyebrow?: string;
  title?: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  well?: boolean;
  children: ReactNode;
  label?: string;
}) {
  const titled = eyebrow && title;
  return (
    <section
      className={`${s.section} ${well ? s.well : ''}`}
      data-well={well || undefined}
      aria-labelledby={titled ? `${id}-title` : undefined}
      aria-label={titled ? undefined : label}
      id={id}
    >
      <div className={s.wrap}>
        {titled && <SectionHead eyebrow={eyebrow} title={title} lede={lede} id={`${id}-title`} action={action} />}
        {children}
      </div>
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={s.textLink}>
      {children} <Icon name="arrow-right" size={16} />
    </Link>
  );
}

/** Short facts with a check icon. */
export function Facts({ items }: { items: ReactNode[] }) {
  return (
    <ul className={s.facts}>
      {items.map((it, i) => (
        <li key={i}>
          <Icon name="check" size={18} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** The closing call to action (vengeance-ui call-to-action/one: centred
    title, one line, two buttons), on a paper card with the rays backdrop. */
export function CtaBand({
  title = 'Put your next event on the record.',
  text = 'Set-up takes about a minute, then a practice event teaches the rest. Volunteers never pay.',
  primary = { href: '/org/start', label: 'Start free' },
  secondary = { href: '/join', label: 'Join as a volunteer' },
  note = 'Free while SycaMore Live is a student demo. Nothing is charged.',
}: {
  title?: string;
  text?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  note?: string;
}) {
  return (
    <section className={s.cta} aria-labelledby="cta-title">
      <div className={s.wrap}>
        <Reveal className={s.ctaCard}>
          <Rays corner="center" />
          <h2 className={s.ctaTitle} id="cta-title">
            {title}
          </h2>
          <p className={s.ctaText}>{text}</p>
          <div className={s.ctas}>
            <Link href={primary.href} className={`btn btn-primary btn-big ${s.ctaBtn}`}>
              {primary.label} <Icon name="arrow-right" size={20} />
            </Link>
            <Link href={secondary.href} className="btn btn-big">
              {secondary.label}
            </Link>
          </div>
          {note && <p className={s.ctaNote}>{note}</p>}
        </Reveal>
      </div>
    </section>
  );
}

export { s as siteStyles };

/** An AI-generated botanical illustration (see public/media/README.md). */
export function Illo({ name, size = 112, className }: { name: IlloName; size?: number; className?: string }) {
  return (
    <span className={`${s.illo} ${className ?? ''}`} style={{ width: size }} aria-hidden="true">
      <Image src={illo(name)} alt="" fill sizes={`${size}px`} />
    </span>
  );
}
