'use client';

import { useEffect } from 'react';

// Moves focus to the success heading so screen readers announce it.
export function FocusOnMount({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.focus({ preventScroll: true });
  }, [id]);
  return null;
}
