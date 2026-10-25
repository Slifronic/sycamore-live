'use client';

// An inline script that runs while the HTML is parsed (hard loads) and is inert
// when React renders it in the browser (client renders, the not-found tree), so
// React doesn't warn about a <script> it would never execute. The pattern from
// Next 16's "Preventing flash before hydration" guide; suppressHydrationWarning
// covers the type attribute differing between server and client.
export function InlineScript({ html }: { html: string }) {
  return <script type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
