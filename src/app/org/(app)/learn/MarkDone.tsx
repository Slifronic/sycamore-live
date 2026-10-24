'use client';

import { useTransition } from 'react';
import { completeLesson } from '../../actions';
import type { LessonKey } from '@/lib/course';

export function MarkDone({ lesson }: { lesson: LessonKey }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => start(() => completeLesson(lesson))}>
      I already know this
    </button>
  );
}
