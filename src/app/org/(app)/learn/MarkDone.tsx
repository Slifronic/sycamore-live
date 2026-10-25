'use client';

import { useTransition } from 'react';
import { completeLesson } from '../../actions';
import { toast } from '@/components/shell/Toast';
import type { LessonKey } from '@/lib/course';

export function MarkDone({ lesson, title }: { lesson: LessonKey; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await completeLesson(lesson);
          toast.success(`Marked “${title}” done`);
        })
      }
    >
      I already know this
    </button>
  );
}
