import type { ReactNode } from 'react';

// One header for every org page: eyebrow, title, a one-line lede, the action on the right.
export function PageHeader({ eyebrow, title, lede, action, className = '' }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={`page-head ${className}`}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {lede && <p className="page-lede">{lede}</p>}
      </div>
      {action && <div className="row wrap">{action}</div>}
    </header>
  );
}
