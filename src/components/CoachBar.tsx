'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { lessonByKey, type LessonKey } from '@/lib/course';

// Shown on any screen opened from a lesson's "Try it" button.
export function CoachBar() {
  const key = useSearchParams().get('learn') as LessonKey | null;
  const lesson = key ? lessonByKey[key] : null;
  if (!lesson) return null;
  return (
    <div className="notice notice-green no-print" role="status" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <span>
        <strong>Lesson: {lesson.title}.</strong> {lesson.coach}
      </span>
      <Link href="/org/learn" className="btn btn-sm">
        Back to lessons
      </Link>
    </div>
  );
}
