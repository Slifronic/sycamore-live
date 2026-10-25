'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/shell/icons';
import s from './home.module.css';

// Read by the Home page (server) under the same name.
const LESSON_HINT_COOKIE = 'sm-hide-lesson';

/**
 * One quiet line in the welcome strip: progress through the getting-started
 * course (the same count /org/learn shows) and the next lesson. Dismissing it sets a cookie, so the server stops
 * rendering it (no flash on the next visit); /org/learn keeps the full course.
 */
export function LessonHint({ done, total, title, minutes, href }: { done: number; total: number; title: string; minutes: number; href: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <p className={s.lesson}>
      <Icon name="book" size={16} />
      <span className={s.lessonText}>
        <span className={s.lessonMeta}>
          {done} of {total} lessons done · Next:
        </span>{' '}
        <Link href={href}>{title}</Link>
        <span className={s.lessonMeta}> · {minutes} min</span>
      </span>
      <button
        type="button"
        className={s.lessonX}
        aria-label="Hide the lesson hint"
        onClick={() => {
          document.cookie = `${LESSON_HINT_COOKIE}=1; path=/org; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          setHidden(true);
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </p>
  );
}
