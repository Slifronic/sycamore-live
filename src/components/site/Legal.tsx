import Link from 'next/link';
import type { ReactNode } from 'react';
import { siteStyles as ss } from './Blocks';
import l from './legal.module.css';

// One layout for the legal pages: a short plain-language summary first, then
// numbered sections with a sticky contents list on wide screens. Written for
// a student project running as a demo: no legalese, no claims of audits or
// certifications.

export const LEGAL_UPDATED = 'October 25, 2026';
export const LEGAL_UPDATED_ISO = '2026-10-25';

/** Where privacy questions go. Set NEXT_PUBLIC_CONTACT_EMAIL to publish an address. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;

export function Contact() {
  return CONTACT_EMAIL ? (
    <>
      Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We’ll answer within 7 days.
    </>
  ) : (
    <>
      We haven’t set up a dedicated address yet. Until we do, ask the organization you volunteer with to pass your request to us, or find the team
      through the <Link href="/about">About page</Link>. We’ll answer within 7 days.
    </>
  );
}

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalPage({
  eyebrow = 'Legal',
  title,
  lede,
  summary,
  sections,
  related,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  summary: ReactNode[];
  sections: LegalSection[];
  related: { href: string; label: string }[];
}) {
  return (
    <article className={l.page} aria-labelledby="page-title">
      <header className={`${ss.wrap} ${l.head}`}>
        <p className={ss.eyebrow}>{eyebrow}</p>
        <h1 className={l.title} id="page-title">
          {title}
        </h1>
        <p className={ss.lede}>{lede}</p>
        <p className={l.updated}>
          Last updated <time dateTime={LEGAL_UPDATED_ISO}>{LEGAL_UPDATED}</time>
        </p>
      </header>

      <div className={`${ss.wrap} ${l.grid}`}>
        <nav className={l.toc} aria-label="On this page">
          <p className={l.tocTitle}>On this page</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
          <p className={l.tocTitle}>Related</p>
          <ul>
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>{r.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={l.body}>
          <section className={l.summary} aria-labelledby="summary-title">
            <h2 id="summary-title" className={l.summaryTitle}>
              The short version
            </h2>
            <ul>
              {summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className={l.section} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className={l.h2}>
                <span className={l.num}>{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              <div className={l.prose}>{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

/** A two-column table for "what, why" lists. */
export function DataTable({ head, rows }: { head: [string, string, string?]; rows: [ReactNode, ReactNode, ReactNode?][] }) {
  const three = head.length === 3;
  return (
    <div className={l.tableWrap}>
      <table className={l.table}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{r[0]}</th>
              <td>{r[1]}</td>
              {three && <td>{r[2]}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
