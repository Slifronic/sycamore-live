import Link from 'next/link';
import type { ReactNode } from 'react';
import { CountUp } from '../motion/CountUp';
import { Sparkline } from '../motion/Sparkline';
import { Icon, type IconName } from '../shell/icons';
import s from './ui.module.css';

export type Delta = {
  /** What to print: "+12", "3.2%", "+4 this month". */
  value: ReactNode;
  /** Arrow direction. */
  dir?: 'up' | 'down' | 'flat';
  /** Colour meaning. Defaults: up = good (green), down = bad (red), flat = neutral. */
  tone?: 'good' | 'bad' | 'neutral';
  /** Spoken context, e.g. "versus the previous 30 days". */
  label?: string;
};

/**
 * One headline number (the Vessa stat card): a label, a big Fraunces numeral
 * that counts up once on screen, an optional delta chip, an icon chip in the
 * corner, and a sparkline (pass `spark` points, or any node in `sparkSlot`).
 * With `href` the whole card is a link that lifts on hover.
 *
 *   <StatCard label="Verified hours · 30 days" value={612} icon="clock"
 *     delta={{ value: '+48', dir: 'up', label: 'vs the 30 days before' }}
 *     spark={[12, 30, 41, 60, 88]} foot="Across 6 events" href="/org/reports" />
 */
export function StatCard({
  label,
  value,
  decimals = 0,
  unit,
  delta,
  icon,
  iconTone = 'sap',
  spark,
  sparkSlot,
  foot,
  href,
  countUp = true,
  className = '',
}: {
  label: ReactNode;
  value: number | null;
  decimals?: number;
  unit?: ReactNode;
  delta?: Delta;
  icon?: IconName;
  iconTone?: 'sap' | 'butter' | 'mist' | 'blush' | 'ink';
  spark?: number[];
  sparkSlot?: ReactNode;
  foot?: ReactNode;
  href?: string;
  countUp?: boolean;
  className?: string;
}) {
  const tone = delta?.tone ?? (delta?.dir === 'up' ? 'good' : delta?.dir === 'down' ? 'bad' : 'neutral');
  const chipTone = tone === 'good' ? 'chip-green' : tone === 'bad' ? 'chip-red' : 'chip-ink';
  const body = (
    <>
      <div className={s.statTop}>
        <p className={s.statLabel}>{label}</p>
        {icon && (
          <span className={s.statIcon} data-tone={iconTone} aria-hidden>
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <div className={s.statValue}>
        <span className={`figure ${s.statNum}`}>
          {value == null ? '—' : countUp ? <CountUp value={value} decimals={decimals} /> : value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          {unit && <span className="figure-unit">{unit}</span>}
        </span>
        {delta && (
          <span className={`chip ${chipTone} ${s.delta}`}>
            {delta.dir && delta.dir !== 'flat' && <Icon name={delta.dir === 'up' ? 'trend-up' : 'trend-down'} size={13} strokeWidth={2} />}
            {delta.value}
            {delta.label && <span className="sr-only"> {delta.label}</span>}
          </span>
        )}
      </div>
      {(foot || spark || sparkSlot) && (
        <div className={s.statBottom}>
          {foot ? <p className={s.statFoot}>{foot}</p> : <span />}
          {sparkSlot ?? (spark && spark.length > 1 && <Sparkline points={spark} width={96} height={30} area className={s.statSpark} />)}
        </div>
      )}
    </>
  );
  if (href)
    return (
      <Link href={href} className={`card hover-lift ${s.stat} ${className}`}>
        {body}
      </Link>
    );
  return <div className={`card ${s.stat} ${className}`}>{body}</div>;
}
