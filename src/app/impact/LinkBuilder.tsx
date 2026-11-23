'use client';

import { useMemo, useState } from 'react';
import { toast } from '@/components/shell/Toast';
import s from './impact.module.css';

// Makes a shareable link with a ?via= tag, so the team can see on this page
// which invitations bring people in ("taproot-ig", "khanh", "fbla-club").
export function LinkBuilder({ base, listings }: { base: string; listings: { slug: string; label: string }[] }) {
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(listings.find((l) => l.slug.startsWith('taproot'))?.slug ?? '');
  const clean = tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const link = useMemo(() => `${base}${page ? `/opportunities/${page}` : '/'}${clean ? `?via=${clean}` : ''}`, [base, page, clean]);
  return (
    <div className={s.builder}>
      <label>
        <span>Tag</span>
        <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. khanh-friends" maxLength={40} />
      </label>
      <label>
        <span>Page</span>
        <select className="select" value={page} onChange={(e) => setPage(e.target.value)}>
          <option value="">Home page</option>
          {listings.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <div className={s.linkOut}>
        <code>{link}</code>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!clean}
          onClick={() => {
            void navigator.clipboard.writeText(link).then(
              () => toast({ title: 'Link copied', tone: 'success' }),
              () => toast({ title: 'Copy it by hand: the browser blocked the clipboard', tone: 'warning' }),
            );
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
}
