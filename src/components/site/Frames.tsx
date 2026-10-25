import Image from 'next/image';
import { screen, type ScreenName } from './media';
import s from './frames.module.css';

// Photo frames and device shells. Every frame has a parchment background, so
// an image that hasn't loaded yet reads as an intentional empty plate.

export function Photo({
  src,
  alt,
  sizes,
  className,
  priority,
  ratio,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  ratio?: string;
}) {
  return (
    <div className={`${s.photo} ${className ?? ''}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={s.img} />
    </div>
  );
}

const SCREEN_ALT: Record<ScreenName, string> = {
  'org-dashboard': 'The coordinator dashboard: verified hours, volunteers, events verified and the value of volunteer time, then what needs you and the event happening now',
  'event-day': 'Event day: the check-in QR code and six-character code beside the live roster of who is here now',
  verify: 'The verify screen: every volunteer with hours pre-filled from their scans, a role and standout star, and a running total above Verify & close',
  'sheet-import': 'Paper sheet import: rows drafted from a photo of the sign-in sheet, unclear rows in amber, each confirmed by the coordinator before it counts',
  'record-public': 'A public record page on a phone marked Verified, with the organization’s statement, the hours and role, and who to contact',
  'me-phone': 'My hours on a phone: attested hours, events and organizations, with one event waiting for confirmation',
  'checkin-phone': 'Checked in on a phone: a running timer and a Check out button',
  'hour-letter': 'A printable hour letter with each event’s date, role and hours, signed by the coordinator',
};

function Placeholder({ kind }: { kind: 'laptop' | 'phone' }) {
  if (kind === 'phone') {
    return (
      <div className={s.phSkeleton} aria-hidden="true">
        <span className={s.phTop} />
        <span className={s.phHero} />
        <span className={s.phLine} />
        <span className={`${s.phLine} ${s.short}`} />
        <span className={s.phCard} />
        <span className={s.phCard} />
        <span className={s.phBtn} />
      </div>
    );
  }
  return (
    <div className={s.lapSkeleton} aria-hidden="true">
      <span className={s.lapSide} />
      <span className={s.lapMain}>
        <span className={s.lapHead} />
        <span className={s.lapKpis}>
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className={s.lapRows}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={s.lapRow}>
              <span />
              <span className={i === 1 ? s.amber : s.green} />
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

export function Laptop({ name, className, sizes = '(min-width: 1024px) 640px, 92vw', src }: { name: ScreenName; className?: string; sizes?: string; src?: string }) {
  const img = src ?? screen(name);
  return (
    <figure className={`${s.laptop} ${className ?? ''}`} role="img" aria-label={SCREEN_ALT[name]}>
      <div className={s.lid}>
        <span className={s.cam} aria-hidden="true" />
        <div className={s.screen}>{img ? <Image src={img} alt="" fill sizes={sizes} className={s.img} /> : <Placeholder kind="laptop" />}</div>
      </div>
      <div className={s.base} aria-hidden="true" />
    </figure>
  );
}

export function Phone({ name, className, sizes = '(min-width: 1024px) 280px, 60vw', src }: { name: ScreenName; className?: string; sizes?: string; src?: string }) {
  const img = src ?? screen(name);
  return (
    <figure className={`${s.phone} ${className ?? ''}`} role="img" aria-label={SCREEN_ALT[name]}>
      <div className={s.phoneScreen}>
        <span className={s.island} aria-hidden="true" />
        {img ? <Image src={img} alt="" fill sizes={sizes} className={s.img} /> : <Placeholder kind="phone" />}
      </div>
    </figure>
  );
}
