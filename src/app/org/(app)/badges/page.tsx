import { requireOrg } from '@/lib/session';
import { loadOrgInsights } from '@/lib/insights';
import { BADGES, badgeByKey } from '@/lib/badges';
import { SignBadgeForm } from './SignBadgeForm';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/media/EmptyState';

export const metadata = { title: 'Badges' };

export default async function BadgesPage() {
  const org = await requireOrg();
  const ins = await loadOrgInsights(org.id);
  const earnedCount = (key: string) => ins.awards.filter((a) => a.badge === key).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow={`People · ${ins.badgeReady.length} ready to sign`}
        title="Badges"
        lede="A badge records that a volunteer met a rule in your verified hours and roles. SycaMore finds who meets each rule; a badge only counts once you sign it, with your note where the badge asks for one."
      />

      <section className="stack">
        <h2>Ready for your sign-off {ins.badgeReady.length > 0 && <span className="chip chip-amber">{ins.badgeReady.length}</span>}</h2>
        {ins.badgeReady.length === 0 ? (
          <div className="card">
            <EmptyState compact illo="leaf-badge" title="Nobody is waiting.">
              When someone meets a badge’s rule in your verified events, they show up here for your signature.
            </EmptyState>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {ins.badgeReady.map(({ v, badge }) => {
              const def = badgeByKey[badge];
              return (
                <div key={`${v.key}-${badge}`} className="card card-pad stack">
                  <div>
                    <p className="small muted">{def.name}</p>
                    <h3>{v.name}</h3>
                    <p className="small muted">
                      {v.events} events · {v.hours} hours · {def.rule}
                    </p>
                  </div>
                  <SignBadgeForm volunteerId={v.volunteer_id!} badge={badge} needsNote={def.needsNote} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {ins.badgeClose.length > 0 && (
        <section className="stack">
          <h2>Almost there</h2>
          <p className="muted small">A great reason to invite someone back: tell them how close they are.</p>
          <div className="card">
            <table className="t">
              <tbody>
                {ins.badgeClose.slice(0, 10).map((c) => (
                  <tr key={`${c.v.key}-${c.key}`}>
                    <td style={{ width: '32%' }}>
                      <strong>{c.v.name}</strong>
                    </td>
                    <td className="small">{badgeByKey[c.key].name}</td>
                    <td style={{ width: '30%' }}>
                      <div className="bar">
                        <span style={{ width: `${Math.round(c.progress * 100)}%` }} />
                      </div>
                    </td>
                    <td className="num small" style={{ width: 60 }}>
                      {Math.round(c.progress * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="stack">
        <h2>The badges</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {BADGES.map((b) => (
            <div key={b.key} className="card card-pad stack" style={{ gap: 6 }}>
              <h3>{b.name}</h3>
              <p className="small">
                <strong>Rule:</strong> {b.rule}
                {b.needsNote ? `, plus your note: ${b.needsNote.toLowerCase()}` : ''}
              </p>
              <p className="small muted">{earnedCount(b.key)} signed so far</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export const instant = false;
