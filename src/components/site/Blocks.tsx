import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Reveal } from './Reveal';
import { illo, type IlloName } from './media';
import s from './site.module.css';

// Small server building blocks shared by every marketing page.

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={s.eyebrow}>{children}</p>;
}

/** A page title whose lines rise out of a mask on load (hero-entrance.md). */
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
}: {
  eyebrow: string;
  title: ReactNode[];
  lede: ReactNode;
  children?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <section className={s.pageHero} aria-labelledby="page-title">
      <div className={`${s.wrap} ${art ? s.pageHeroGrid : ''}`}>
        <div className={s.pageHeroText}>
          <p className={`${s.eyebrow} ${s.fade}`} style={{ ['--d' as string]: '0s' }}>
            {eyebrow}
          </p>
          <RiseTitle lines={title} id="page-title" />
          <p className={`${s.lede} ${s.fade}`} style={{ ['--d' as string]: '.35s' }}>
            {lede}
          </p>
          {children && (
            <div className={s.fade} style={{ ['--d' as string]: '.5s' }}>
              {children}
            </div>
          )}
        </div>
        {art && (
          <div className={`${s.pageHeroArt} ${s.fade}`} style={{ ['--d' as string]: '.25s' }}>
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
  split,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  id?: string;
  split?: boolean;
}) {
  return (
    <Reveal className={`${s.head} ${split ? s.headSplit : ''}`}>
      <div style={{ display: 'grid', gap: 18 }}>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h2 className={s.h2} id={id}>
          {title}
        </h2>
      </div>
      {lede && <p className={s.lede}>{lede}</p>}
    </Reveal>
  );
}

export function Illo({ name, size = 112, className }: { name: IlloName; size?: number; className?: string }) {
  return (
    <span className={`${s.illo} ${className ?? ''}`} style={{ width: size }} aria-hidden="true">
      <Image src={illo(name)} alt="" fill sizes={`${size}px`} />
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={s.textLink}>
      {children} <span aria-hidden="true">→</span>
    </Link>
  );
}

export function CtaBand({
  title = 'Run your next event on the record.',
  text = 'Set up takes about a minute: four boxes, then a practice event and a short course that teaches by doing. Volunteers never pay.',
  primary = { href: '/org/start', label: 'Set up your organization' },
  secondary = { href: '/join', label: 'I’m volunteering' },
  note = 'Free while SycaMore Live is a hackathon demo. Nothing is charged.',
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
          <div>
            <h2 className={s.ctaTitle} id="cta-title">
              {title}
            </h2>
            <p className={s.ctaText}>{text}</p>
          </div>
          <div className={s.ctaActions}>
            <div className={s.ctas}>
              <Link href={primary.href} className={`btn btn-big ${s.btnLight}`}>
                {primary.label}
              </Link>
              <Link href={secondary.href} className={`btn btn-big ${s.btnGhostLight}`}>
                {secondary.label}
              </Link>
            </div>
            {note && <p className={s.ctaNote}>{note}</p>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { s as siteStyles };
