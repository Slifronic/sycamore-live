// Light / dark theme. The choice lives per browser in localStorage; with no
// choice stored, the system setting decides (the no-flash script in
// shell/ThemeScript.tsx applies it before first paint). Everything visual hangs off
// `data-theme` on <html>, so a theme change is one attribute write.

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'sycamore-theme';

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still changes for this page.
  }
}

/**
 * Switch theme. With an `origin` element (the toggle that was pressed), the
 * new theme grows as a circle from its centre: a View Transition snapshots the
 * page, the attribute flips, and the new snapshot's clip-path animates from 0
 * to the farthest corner (620ms, ease-in-out). Without the API, or under
 * reduced motion, it's an instant swap.
 */
export function setTheme(theme: Theme, origin?: Element | null) {
  if (theme === currentTheme()) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!origin || reduce || typeof document.startViewTransition !== 'function') {
    apply(theme);
    return;
  }
  const r = origin.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;
  root.classList.add('theme-wipe');
  const vt = document.startViewTransition(() => apply(theme));
  vt.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 620, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  vt.finished.finally(() => root.classList.remove('theme-wipe'));
}

export function toggleTheme(origin?: Element | null) {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark', origin);
}

/** Subscribe to theme changes (for useSyncExternalStore). */
export function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
