'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { lessonByKey, type LessonKey } from '@/lib/course';
import { Icon } from './shell/icons';

// Shown on any screen opened from a lesson's "Try it" button: one slim line
// with the lesson's coaching tip and the way back to the course.
export function CoachBar() {
  const key = useSearchParams().get('learn') as LessonKey | null;
  const lesson = key ? lessonByKey[key] : null;
  if (!lesson) return null;
  return (
    <div
      className="no-print"
      role="status"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        marginBottom: 16,
        maxWidth: 'var(--page-max)',
        padding: '8px 8px 8px 12px',
        borderRadius: 12,
        background: 'var(--primary-soft)',
        color: 'var(--ink-2)',
        fontSize: 13.5,
        lineHeight: 1.4,
      }}
    >
      <Icon name="book" size={16} style={{ color: 'var(--sap)', flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: 'var(--canopy)' }}>{lesson.title}.</strong> {lesson.coach}
      </span>
      <Link href="/org/learn" className="btn btn-sm btn-quiet" style={{ flex: 'none' }}>
        All lessons
      </Link>
    </div>
  );
}
