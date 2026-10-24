import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { markLesson } from '@/lib/org-data';
import { IndexCard } from '@/components/IndexCard';

const TIERS = [
  { name: 'Platinum', from: 90 },
  { name: 'Gold', from: 75 },
  { name: 'Silver', from: 60 },
  { name: 'Bronze', from: 45 },
];

export default async function IndexPage() {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  await markLesson(org.id, 'index_viewed');
  const lowest = ins.index.parts.filter((p) => p.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const score = ins.index.score;
  const nextTier = score == null ? null : [...TIERS].reverse().find((t) => t.from > score);

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 900 }}>
      <header>
        <h1>Your SycaMore Index</h1>
        <p className="muted">
          One number from 0 to 100 that shows a funder your volunteer program runs well. You never enter anything into it: it’s built from check-ins
          and the two-minute verify you already do.
        </p>
      </header>

      <IndexCard index={ins.index} full />

      {lowest && (
        <section className="card card-pad stack">
          <h2>Where to focus next</h2>
          <p>
            <strong>{lowest.label}</strong> is your lowest part at {lowest.score}. {lowest.how}
          </p>
          {nextTier && score != null && (
            <p className="muted small">
              {nextTier.from - score} more points reaches {nextTier.name}.
            </p>
          )}
        </section>
      )}

      <section className="card card-pad stack">
        <h2>How it’s calculated</h2>
        <p className="num" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 14 }}>
          Index = retention × 0.35 + coordinator efficiency × 0.30 + event completion × 0.35
          {score != null &&
            ` = ${ins.index.parts.map((p) => `${p.score} × ${p.weight.toFixed(2)}`).join(' + ')} = ${score}`}
        </p>
        <ul className="stack small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <strong>Volunteer retention:</strong> of volunteers whose first event was at least two weeks ago, the share who came back for another.
          </li>
          <li>
            <strong>Coordinator efficiency:</strong> how quickly events get verified after they end (same day scores 100). The app measures this; nobody
            self-reports it.
          </li>
          <li>
            <strong>Event completion:</strong> your answer to “did the event achieve its goal?” at close. Yes counts 100, partly 55, no 0.
          </li>
        </ul>
        <p className="small muted">
          Tiers: Platinum 90+, Gold 75+, Silver 60+, Bronze 45+. The tier is provisional until three events are verified. Event completion is your own
          answer, so the report labels it that way.
        </p>
      </section>
    </div>
  );
}

export const instant = false;
