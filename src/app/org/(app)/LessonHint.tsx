'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/shell/icons';
import s from './home.module.css';

// Read by the Home page (server) under the same name.
const LESSON_HINT_COOKIE = 'sm-hide-lesson';

/**
 * One quiet line under the welcome card's actions: the next lesson of the
 * getting-started course. Dismissing it sets a cookie, so the server stops
 * rendering it (no flash on the next visit); /org/learn keeps the full course.
 */
export function LessonHint({ n, total, title, minutes, href }: { n: number; total: number; title: string; minutes: number; href: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <p className={s.lesson}>
      <Icon name="book" size={16} />
      <span className={s.lessonText}>
        <span className={s.lessonMeta}>
          Lesson {n} of {total}
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
