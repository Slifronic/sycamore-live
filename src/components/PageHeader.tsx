import type { ReactNode } from 'react';

/**
 * The one header for every app page (REDESIGN-2026-10-25):
 *   eyebrow — a short line above the title ("Who came, and how often")
 *   title   — the page name
 *   lede    — optional, one line, 90 characters at most; explanations go in a
 *             help popover or /learn, not here
 *   controls — optional: ONE segmented control (a range or filter)
 *   action  — optional: ONE action (the page's primary, or a secondary like Export)
 *
 *   <PageHeader eyebrow="People" title="Volunteers"
 *     controls={<Segmented id="range" size="sm" … />}
 *     action={<Link className="btn btn-primary" href="…">Export</Link>} />
 *
 * Backward compatible: older pages pass several buttons in `action`; they
 * still lay out in a row.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  controls,
  action,
  className = '',
  titleId,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  controls?: ReactNode;
  action?: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <header className={`page-head ${className}`}>
      <div className="page-head-text">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 id={titleId}>{title}</h1>
        {lede && <p className="page-lede">{lede}</p>}
      </div>
      {(controls || action) && (
        <div className="page-head-side">
          {controls}
          {action && <div className="row wrap page-head-action">{action}</div>}
        </div>
      )}
    </header>
  );
}
