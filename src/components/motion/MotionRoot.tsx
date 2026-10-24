'use client';

import { MotionConfig } from 'motion/react';

// Backstop: every Motion animation follows the viewer's reduced-motion setting.
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
