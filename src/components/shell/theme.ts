// Light / dark theme and the nature palette. Both live per browser in
// localStorage. Light is the default whatever the system setting says: dark is
// only ever an explicit choice from the app's account menu. The palette
// (app/palettes.css) defaults to Morning Grove. The no-flash script in
// shell/ThemeScript.tsx applies both before first paint; everything visual
// hangs off `data-theme` and `data-palette` on <html>.

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'sycamore-theme';
export const PALETTE_KEY = 'sycamore-palette';

export const PALETTES = [
  { id: 'grove', name: 'Morning Grove', note: 'Sage mist and moss', swatch: ['#eef0e6', '#4a6b34', '#c9b46a'] },
  { id: 'bark', name: 'Sycamore Bark', note: 'Cream, olive and bark tan', swatch: ['#f4efe4', '#596a2c', '#b98a4b'] },
  { id: 'meadow', name: 'Meadow Light', note: 'Bright leaf and wildflower', swatch: ['#f6f8f1', '#2f7a3f', '#e3b93c'] },
  { id: 'autumn', name: 'Autumn Canopy', note: 'Evergreen and ochre', swatch: ['#f6efe3', '#2f5d3a', '#c8862f'] },
] as const;

export type Palette = (typeof PALETTES)[number]['id'];

export function currentPalette(): Palette {
  if (typeof document === 'undefined') return 'grove';
  const p = document.documentElement.dataset.palette;
  return PALETTES.some((x) => x.id === p) ? (p as Palette) : 'grove';
}

export function setPalette(p: Palette) {
  document.documentElement.dataset.palette = p;
  try {
    localStorage.setItem(PALETTE_KEY, p);
  } catch {
    // Blocked storage: the palette still changes for this page.
  }
  window.dispatchEvent(new Event('sycamore-palette'));
}

/** Subscribe to palette changes (for useSyncExternalStore). */
export function subscribePalette(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
  return () => mo.disconnect();
}

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
