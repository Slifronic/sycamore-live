'use client';

import { useLayoutEffect } from 'react';
import { InlineScript } from './InlineScript';
import { PALETTE_KEY, THEME_KEY } from './theme';

// The no-flash theme script for the root layout. On a normal load it runs while
// the HTML is parsed, before first paint. When the root layout is rendered in
// the browser instead (a 404 shell, where the server HTML has no layout), the
// script is inert, so the effect applies the same choice before paint.
const NO_FLASH = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('${THEME_KEY}');d.dataset.theme=t==='dark'?'dark':'light';var p=localStorage.getItem('${PALETTE_KEY}');if(/^(grove|bark|meadow|autumn)$/.test(p||''))d.dataset.palette=p;}catch(e){d.dataset.theme='light';}})();`;

export function ThemeScript() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme) return;
    let t: string | null = null;
    try {
      t = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage blocked: light.
    }
    root.dataset.theme = t === 'dark' ? 'dark' : 'light';
  }, []);
  return <InlineScript html={NO_FLASH} />;
}
