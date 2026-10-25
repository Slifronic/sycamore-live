'use client';

import { useLayoutEffect } from 'react';
import { InlineScript } from './InlineScript';
import { THEME_KEY } from './theme';

// The no-flash theme script for the root layout. On a normal load it runs while
// the HTML is parsed, before first paint. When the root layout is rendered in
// the browser instead (a 404 shell, where the server HTML has no layout), the
// script is inert, so the effect applies the same choice before paint.
const NO_FLASH = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export function ThemeScript() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme) return;
    let t: string | null = null;
    try {
      t = localStorage.getItem(THEME_KEY);
    } catch {
      // Storage blocked: fall back to the system setting.
    }
    root.dataset.theme = t === 'light' || t === 'dark' ? t : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);
  return <InlineScript html={NO_FLASH} />;
}
