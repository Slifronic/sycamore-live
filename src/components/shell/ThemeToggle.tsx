'use client';

import { useSyncExternalStore } from 'react';
import { currentTheme, subscribeTheme, toggleTheme } from './theme';
import { Icon } from './icons';
import { Tooltip } from '../ui/Tooltip';
import u from '../ui/ui.module.css';

const useTheme = () => useSyncExternalStore(subscribeTheme, currentTheme, () => 'light' as const);

/**
 * The dark-theme switch. One pattern everywhere: it is labelled "Dark theme"
 * (the state, never the action) and shows whether it's on. Pressing it wipes
 * the new theme in as a circle from the control (shell/theme.ts). The on
 * state is drawn by CSS from `data-theme`, so it's right before hydration.
 *
 * - variant="icon" (default): a 40px moon button (rail, bars). The moon fills
 *   in when dark is on; the tooltip reads "Dark theme: on / off".
 * - variant="row": a full-width row with the label and a switch (account
 *   screens, menus).
 * - variant="inline": a small pill with the label and a mini switch (the site
 *   footer, the public frame).
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

  if (variant === 'row')
    return (
      <button type="button" role="switch" aria-checked={dark} className={`${u.themeRow} ${className}`} onClick={(e) => toggleTheme(e.currentTarget.querySelector('[data-origin]'))}>
        <span className={u.themeRowLabel}>
          <Icon name="moon" size={20} className={u.themeMoon} />
          Dark theme
        </span>
        <span className={u.switch} data-origin aria-hidden />
      </button>
    );

  if (variant === 'inline')
    return (
      <button type="button" role="switch" aria-checked={dark} className={`${u.themeInline} ${className}`} onClick={(e) => toggleTheme(e.currentTarget.querySelector('[data-origin]'))}>
        <span>Dark theme</span>
        <span className={u.switchSm} data-origin aria-hidden />
      </button>
    );

  const btn = (
    <button type="button" role="switch" aria-checked={dark} aria-label="Dark theme" className={`${u.iconBtn} ${u.themeIcon} ${className}`} onClick={(e) => toggleTheme(e.currentTarget)}>
      <Icon name="moon" size={20} className={u.themeMoon} />
    </button>
  );
  return tooltip ? (
    <Tooltip
      label={
        <>
          Dark theme: <span className={u.whenLight}>off</span>
          <span className={u.whenDark}>on</span>
        </>
      }
      side={tooltip}
    >
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}
