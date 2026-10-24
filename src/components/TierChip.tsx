import type { Tier } from '@/lib/insights';

// Butter is for Gold and Platinum (and "needs you"); Silver and Bronze are a quiet neutral.
export const tierClass = (tier: Tier) => (tier === 'Gold' || tier === 'Platinum' ? 'chip-gold' : 'chip-silver');

export function TierChip({ tier, provisional, score }: { tier: Tier; provisional: boolean; score: number | null }) {
  if (score == null || tier === 'Building') return <span className="chip chip-ink">Index: {score == null ? 'building' : score}</span>;
  return (
    <span className={`chip ${tierClass(tier)}`} title={provisional ? 'Provisional until 3 events are verified' : 'Based on your verified events'}>
      ★ {tier} · {score}
      {provisional ? ' (provisional)' : ''}
    </span>
  );
}
