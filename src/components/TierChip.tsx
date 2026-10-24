import type { Tier } from '@/lib/insights';

export function TierChip({ tier, provisional, score }: { tier: Tier; provisional: boolean; score: number | null }) {
  if (score == null) return <span className="chip chip-ink">Index: building</span>;
  const cls = tier === 'Gold' || tier === 'Platinum' ? 'chip-gold' : tier === 'Building' ? 'chip-ink' : 'chip-green';
  return (
    <span className={`chip ${cls}`} title={provisional ? 'Provisional until 3 events are verified' : 'Based on your verified events'}>
      ★ {tier} · {score}
      {provisional ? ' (provisional)' : ''}
    </span>
  );
}
