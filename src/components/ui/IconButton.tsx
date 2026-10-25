import Link from 'next/link';
import type { ButtonHTMLAttributes, Ref } from 'react';
import { Icon, type IconName } from '../shell/icons';
import { Tooltip } from './Tooltip';
import s from './ui.module.css';

type Common = {
  icon: IconName;
  /** Accessible name, and the tooltip text. */
  label: string;
  /** A small count badge (unread, waiting). Hidden when 0. */
  count?: number;
  countTone?: 'amber' | 'red' | 'green';
  /** What the count means, for screen readers ("waiting to verify"). */
  countLabel?: string;
  variant?: 'ghost' | 'paper' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  /** Tooltip side, or false for none. */
  tooltip?: 'top' | 'right' | 'bottom' | 'left' | false;
  active?: boolean;
  className?: string;
};

/**
 * A square icon-only control with a tooltip. Renders a <Link> when `href` is
 * given, else a <button>. Sizes: sm 32, md 40, lg 44 (touch screens always
 * get 44).
 *
 *   <IconButton icon="bell" label="Waiting to verify" count={2} href="/org/events" />
 */
export function IconButton({
  icon,
  label,
  count = 0,
  countTone = 'amber',
  countLabel,
  variant = 'ghost',
  size = 'md',
  tooltip = 'bottom',
  active,
  className = '',
  href,
  ref,
  ...rest
}: Common & { href?: string; ref?: Ref<HTMLButtonElement> } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const inner = (
    <>
      <Icon name={icon} size={size === 'sm' ? 16 : 20} />
      {count > 0 && (
        <span className={s.count} data-tone={countTone} aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </>
  );
  const name = count > 0 ? `${label}, ${count}${countLabel ? ` ${countLabel}` : ''}` : label;
  const el = href ? (
    <Link href={href} className={`${s.iconBtn} ${className}`} data-variant={variant} data-size={size} data-active={active || undefined} aria-label={name} aria-current={active ? 'page' : undefined}>
      {inner}
    </Link>
  ) : (
    <button ref={ref} type="button" className={`${s.iconBtn} ${className}`} data-variant={variant} data-size={size} data-active={active || undefined} aria-label={name} {...rest}>
      {inner}
    </button>
  );
  return tooltip ? (
    <Tooltip label={label} side={tooltip}>
      {el}
    </Tooltip>
  ) : (
    el
  );
}
