import Link from 'next/link';
import { pendingAttendance, requireVolunteer, volunteerRecords, type VolRecord } from '@/lib/vol-data';
import { volunteerBadges } from '@/lib/vol-badges';
import { fmtHours } from '@/lib/hours';
import { plural } from '@/lib/format';
import { ROLE_LABEL, type Role } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { BadgeEmblem } from '@/components/vol/BadgeEmblem';
import type { BadgeKey } from '@/lib/badges';
import { EmptyState } from '@/components/media/EmptyState';
import { CountUp } from '@/components/motion/CountUp';
import s from './journey.module.css';

export const metadata = {
  title: 'My journey',
  description: 'Every verified event, role and hour in order, with your firsts and the badges signed along the way.',
};

// The first screenful arrives in a quick stagger; later items rise as they scroll in.
const enter = (i: number) => (i < 5 ? { className: 'rise', style: { ['--d' as string]: `${0.12 + i * 0.07}s` } } : { className: 'reveal', style: {} });

// My journey: every attested event, oldest at the bottom, with the role the
// coordinator confirmed, the hours, and the badges organizations signed along
// the way. Only attested records count; practice events never appear (the
// records query excludes them), and pending check-ins are mentioned, not shown.

const longDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
const ROLE_RANK: Role[] = ['general', 'team_lead', 'event_coordinator', 'program_manager'];

type Item =
  | { kind: 'event'; at: string; r: VolRecord; notes: string[]; running: number }
  | { kind: 'badge'; at: string; badge: BadgeKey; name: string; org: string; signer: string };

export default async function JourneyPage() {
  const vol = await requireVolunteer('/me/journey');
  const [records, badges, pending] = await Promise.all([volunteerRecords(vol.id), volunteerBadges(vol.id), pendingAttendance(vol.id)]);
  const active = records.filter((r) => r.status === 'active');

  // Walk oldest to newest to note firsts and the running total, then show newest first.
  const items: Item[] = [];
  const seenOrgs = new Set<string>();
  const seenRoles = new Set<Role>();
  let running = 0;
  for (const r of [...active].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const notes: string[] = [];
    if (items.length === 0) notes.push('Your first attested event.');
    else if (!seenOrgs.has(r.org_id)) notes.push(`First event with ${r.org.name}.`);
    if (r.role !== 'general' && !seenRoles.has(r.role)) notes.push(`First time as ${ROLE_LABEL[r.role].toLowerCase()}.`);
    if (r.hours_adjusted != null) notes.push(`Hours adjusted by ${r.adjusted_by}: “${r.adjustment_reason}”`);
    seenOrgs.add(r.org_id);
    seenRoles.add(r.role);
    running += r.hours_total;
    items.push({ kind: 'event', at: r.starts_at, r, notes, running });
  }
  for (const b of badges) for (const a of b.awards) items.push({ kind: 'badge', at: a.signed_at, badge: b.def.key, name: b.def.name, org: a.org.name, signer: a.signed_by });
  items.sort((a, b) => b.at.localeCompare(a.at));

  const top = [...seenRoles].sort((a, b) => ROLE_RANK.indexOf(b) - ROLE_RANK.indexOf(a))[0];
  const first = active.length ? [...active].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] : null;

  return (
    <div className={s.page}>
      <PageHeader eyebrow="Your service, over time" title="Journey" lede="Every attested event and role, and the badges signed along the way." />

      {active.length > 0 && (
        <section className={s.summary} aria-label="Summary">
          <div>
            <span className={s.label}>Since</span>
            <span className={s.value}>{longDay(first!.starts_at)}</span>
          </div>
          <div>
            <span className={s.label}>Attested</span>
            <span className={s.value}>
              {plural(active.length, 'event')} · <CountUp value={running} decimals={Number.isInteger(running) ? 0 : 1} /> h
            </span>
          </div>
          <div>
            <span className={s.label}>Most responsibility</span>
            <span className={s.value}>{top ? ROLE_LABEL[top] : '—'}</span>
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <p className="notice notice-amber small">
          {plural(pending.length, 'event')} waiting for the organization to confirm {pending.length === 1 ? 'isn’t' : 'aren’t'} shown yet. They join your journey once they’re attested.
        </p>
      )}

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            illo="compass"
            title="Your journey starts at your next event."
            action={
              <Link href="/discover" className="btn btn-primary">
                Find an event
              </Link>
            }
          >
            Once an organization confirms an event you checked in to, it shows here with your role and hours.
          </EmptyState>
        </div>
      ) : (
        <ol className={s.timeline}>
          {items.map((it, i) =>
            it.kind === 'event' ? (
              <li key={`e-${it.r.id}`} className={`${s.item} ${enter(i).className}`} style={enter(i).style}>
                <span className={s.dot} aria-hidden />
                <Link href={`/me/records/${it.r.id}`} className={`card ${s.card}`}>
                  <span className="eyebrow">{longDay(it.r.starts_at)}</span>
                  <span className={s.title}>{it.r.event.title}</span>
                  <span className="small muted">
                    {it.r.org.name}
                    {it.r.event.location ? ` · ${it.r.event.location}` : ''}
                  </span>
                  <span className="row wrap" style={{ gap: 6 }}>
                    <span className={`chip ${it.r.role === 'general' ? 'chip-ink' : 'chip-green'}`}>{ROLE_LABEL[it.r.role]}</span>
                    <span className="chip chip-ink">{fmtHours(it.r.hours_total)} attested h</span>
                    <span className="chip chip-ink">{fmtHours(it.running)} h total</span>
                  </span>
                  {it.notes.map((n) => (
                    <span key={n} className="small">
                      {n}
                    </span>
                  ))}
                </Link>
              </li>
            ) : (
              <li key={`b-${it.badge}-${it.at}`} className={`${s.item} ${enter(i).className}`} style={enter(i).style}>
                <span className={`${s.dot} ${s.dotBadge}`} aria-hidden />
                <Link href={`/me/badges/${it.badge}`} className={`card ${s.card} ${s.badgeCard}`}>
                  <BadgeEmblem badge={it.badge} state="signed" size="sm" />
                  <span className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow">{longDay(it.at)} · Badge signed</span>
                    <span className={s.title}>{it.name}</span>
                    <span className="small muted">
                      Signed by {it.signer} at {it.org}
                    </span>
                  </span>
                </Link>
              </li>
            ),
          )}
        </ol>
      )}
      <Link href="/me/badges" className={s.link}>
        See your badges
      </Link>
    </div>
  );
}

export const instant = false;
