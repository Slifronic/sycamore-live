import type { ReactNode } from 'react';
import { Icon, type IconName } from '../shell/icons';

export type ChipTone = 'green' | 'amber' | 'red' | 'ink' | 'gold' | 'silver';

/**
 * A small status pill. Colour is information: green = verified, amber =
 * needs you, red = a problem, ink = neutral fact, gold/silver = badge tiers.
 * Wraps the global .chip classes so plain markup and this stay identical.
 *
 *   <Chip tone="amber" icon="clock">Needs verification</Chip>
 */
export function Chip({ tone = 'ink', icon, children, className = '', title }: { tone?: ChipTone; icon?: IconName; children: ReactNode; className?: string; title?: string }) {
  return (
    <span className={`chip chip-${tone} ${className}`} title={title}>
      {icon && <Icon name={icon} size={14} strokeWidth={2} />}
      {children}
    </span>
  );
}
