'use client';

import { useId, useState } from 'react';
import { CopyField } from '@/components/events/CopyField';

// "Add to LinkedIn" for a signed badge: an editable post with the public
// verification link, and the Licenses & certifications fields to copy. Nothing
// is posted for the volunteer; LinkedIn opens and they publish it themselves.
// Only shown to adults, and only once the badge has a real verification link.

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', year: 'numeric' });
const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', year: 'numeric' });

export function LinkedInPanel(p: {
  badgeName: string;
  skills: string;
  orgName: string;
  signer: string;
  signedAt: string;
  evidence: string | null;
  url: string | null;
  code: string | null;
}) {
  const textId = useId();
  const [tab, setTab] = useState<'post' | 'profile'>('post');
  const initial = p.url
    ? [
        `I was awarded the ${p.badgeName} badge by ${p.orgName}, for ${p.skills.toLowerCase()}. ${p.signer} signed it on ${longDay(p.signedAt)}.`,
        p.evidence ? `From the coordinator: “${p.evidence}”` : null,
        `Anyone can check it here: ${p.url}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    : '';
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

  if (!p.url || !p.code) {
    return (
      <section className="card card-pad stack">
        <h3>Add to LinkedIn</h3>
        <p className="small muted">Create the verification link first. A LinkedIn post or certification entry should point to it, so anyone can check the badge.</p>
      </section>
    );
  }

  const issued = new Date(p.signedAt);
  const ym = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric' }).formatToParts(issued);
  const year = ym.find((x) => x.type === 'year')?.value ?? '';
  const month = ym.find((x) => x.type === 'month')?.value ?? '';
  const shareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(p.url)}`;
  const addHref =
    'https://www.linkedin.com/profile/add?' +
    new URLSearchParams({ startTask: 'CERTIFICATION_NAME', name: p.badgeName, organizationName: p.orgName, issueYear: year, issueMonth: month, certUrl: p.url, certId: p.code }).toString();

  return (
    <section className="card card-pad stack">
      <div className="row between wrap">
        <h3>Add to LinkedIn</h3>
        <div className="seg" role="tablist" aria-label="LinkedIn options">
          {(['post', 'profile'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className="seg-item" onClick={() => setTab(t)} style={{ border: 0, cursor: 'pointer', background: tab === t ? 'var(--paper)' : 'transparent', boxShadow: tab === t ? 'var(--shadow)' : 'none' }}>
              <span className="seg-text">{t === 'post' ? 'Post' : 'Profile'}</span>
            </button>
          ))}
        </div>
      </div>
      {tab === 'post' ? (
        <>
          <div className="field">
            <label htmlFor={textId}>Your post</label>
            <textarea id={textId} className="input" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
            <span className="hint">Your words; edit anything. Keep the link so readers can check it.</span>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                await navigator.clipboard.writeText(text).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? '✓ Copied' : 'Copy post text'}
            </button>
            <a className="btn" href={shareHref} target="_blank" rel="noopener noreferrer">
              Open LinkedIn ↗
            </a>
          </div>
          <p className="small muted">LinkedIn opens a new post with your verification link. Paste your text there, then review and publish it yourself. Nothing is posted for you.</p>
        </>
      ) : (
        <>
          <p className="small muted">In LinkedIn, go to Add profile section → Licenses &amp; certifications, and copy these in.</p>
          <CopyField label="Name" value={p.badgeName} />
          <CopyField label="Issuing organization" value={p.orgName} />
          <CopyField label="Issue date" value={monthYear(p.signedAt)} />
          <CopyField label="Credential ID" value={p.code} />
          <CopyField label="Credential URL" value={p.url} />
          <a className="btn" href={addHref} target="_blank" rel="noopener noreferrer">
            Open LinkedIn’s certification form ↗
          </a>
          <p className="small muted">The form opens with these fields filled in for you to check. You save it on LinkedIn.</p>
        </>
      )}
      <p className="small muted">SycaMore isn’t affiliated with LinkedIn. The badge is verified by the link, not by LinkedIn.</p>
    </section>
  );
}
