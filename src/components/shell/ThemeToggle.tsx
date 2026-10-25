'use client';

import { useSyncExternalStore } from 'react';
import { currentTheme, subscribeTheme, toggleTheme } from './theme';
import { Icon } from './icons';
import { Tooltip } from '../ui/Tooltip';
import u from '../ui/ui.module.css';

const useTheme = () => useSyncExternalStore(subscribeTheme, currentTheme, () => 'light' as const);

/**
 * The light/dark switch. Pressing it wipes the new theme in as a circle from
 * the button (shell/theme.ts). Which icon shows is decided by CSS from
 * `data-theme`, so it's right before hydration.
 *
 * - variant="icon" (default): a 40px icon button with a tooltip (rail, bars).
 * - variant="row": a full-width row with a label and a switch (account
 *   screens, menus).
 * - variant="inline": a small text button (the site footer).
 */
export function ThemeToggle({
  variant = 'icon',
  tooltip = 'right',
  className = '',
}: {
  variant?: 'icon' | 'row' | 'inline';
  tooltip?: 'top' | 'right' | 'bottom' | 'left' | false;
  className?: string;
}) {
  const theme = useTheme();
  const dark = theme === 'dark';
  const icons = (
    <>
      <Icon name="moon" size={variant === 'inline' ? 16 : 20} className={u.moonIcon} />
      <Icon name="sun" size={variant === 'inline' ? 16 : 20} className={u.sunIcon} />
    </>
  );

  if (variant === 'row')
    return (
      <button type="button" role="switch" aria-checked={dark} className={`${u.themeRow} ${className}`} onClick={(e) => toggleTheme(e.currentTarget.querySelector('[data-origin]'))}>
        <span className={u.themeRowLabel}>
          {icons}
          Dark theme
        </span>
        <span className={u.switch} data-origin aria-hidden />
      </button>
    );

  if (variant === 'inline')
    return (
      <button type="button" aria-pressed={dark} className={className} onClick={(e) => toggleTheme(e.currentTarget)}>
        {icons}
        <span>Dark theme</span>
      </button>
    );

  const btn = (
    <button type="button" aria-pressed={dark} aria-label="Dark theme" className={`${u.iconBtn} ${className}`} onClick={(e) => toggleTheme(e.currentTarget)}>
      {icons}
    </button>
  );
  return tooltip ? (
    <Tooltip label={dark ? 'Light theme' : 'Dark theme'} side={tooltip}>
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}
