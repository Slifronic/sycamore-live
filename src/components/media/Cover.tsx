import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Cover as CoverT } from '@/lib/covers';
import s from './media.module.css';

// An event's cover photo in a parchment frame. The frame is drawn first, so a
// slow (or missing) photo still looks like a deliberate plate, not a hole.
//   hero  — full width, a scrim at the bottom for a title laid over it
//   card  — top of a card, 16:9
//   thumb — a small square beside a list row
export function Cover({
  cover,
  variant = 'card',
  preload = false,
  className = '',
  children,
  sizes,
}: {
  cover: CoverT;
  variant?: 'hero' | 'card' | 'thumb' | 'band';
  preload?: boolean;
  className?: string;
  children?: ReactNode;
  sizes?: string;
}) {
  const small = variant === 'thumb' || variant === 'card';
  return (
    <div className={`${s.frame} ${s[variant]} ${className}`} data-cover={cover.kind}>
      <Image
        src={small ? cover.srcSm : cover.src}
        alt={children ? '' : cover.alt}
        fill
        preload={preload}
        sizes={sizes ?? (variant === 'thumb' ? '72px' : variant === 'card' ? '(max-width: 700px) 100vw, 420px' : '(max-width: 900px) 100vw, 1100px')}
        className={s.img}
      />
      {children && (
        <>
          <div className={s.scrim} aria-hidden />
          <div className={s.over}>{children}</div>
        </>
      )}
    </div>
  );
}
