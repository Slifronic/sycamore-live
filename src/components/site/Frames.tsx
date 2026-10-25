import Image from 'next/image';
import { screen, type ScreenName } from './media';
import s from './frames.module.css';

// Photo frames, a browser-window frame for laptop screenshots, and a phone.
// Screens are real captures of the app on the made-up demo seed.

export function Photo({
  src,
  alt,
  sizes,
  className,
  preload,
  ratio,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
  ratio?: string;
}) {
  return (
    <div className={`${s.photo} ${className ?? ''}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className={s.img} />
    </div>
  );
}

const SCREEN_ALT: Record<ScreenName, string> = {
  'org-dashboard': 'The coordinator dashboard: verified hours, volunteers, events verified, what needs you and the event happening now',
  'event-day': 'Event day: the check-in QR code and six-character code beside the live roster of who is here now',
  verify: 'The verify screen: every volunteer with hours pre-filled from their scans, a role, and Verify & close',
  'sheet-import': 'Paper sheet import: rows drafted from a photo of the sign-in sheet, unclear rows in amber, each confirmed by the coordinator',
  'record-public': 'A public record page on a phone marked Verified, with the organization’s statement, the hours and role, and who to contact',
  'me-phone': 'My hours on a phone: attested hours, events and organizations, with one event waiting for confirmation',
  'checkin-phone': 'Checked in on a phone: a running timer and a Check out button',
  'hour-letter': 'A printable hour letter with each event’s date, role and hours, signed by the coordinator',
};

/**
 * A laptop screenshot in a quiet browser window whose lower edge fades out
 * (the masked-screenshot card from vengeance-ui features/eleven). `crop` is
 * the visible height as a share of the screenshot's width.
 */
export function Shot({
  name,
  className,
  sizes = '(min-width: 1024px) 640px, 92vw',
  crop = 0.56,
  preload,
  host = 'sycamore-live.vercel.app',
}: {
  name: ScreenName;
  className?: string;
  sizes?: string;
  crop?: number;
  preload?: boolean;
  host?: string;
}) {
  return (
    <figure className={`${s.shot} ${className ?? ''}`} role="img" aria-label={SCREEN_ALT[name]}>
      <div className={s.bar} aria-hidden="true">
        <span className={s.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.url}>{host}</span>
      </div>
      <div className={s.view} style={{ aspectRatio: `1 / ${crop}` }}>
        <Image src={screen(name)} alt="" width={1440} height={900} sizes={sizes} preload={preload} className={s.shotImg} />
      </div>
    </figure>
  );
}

export function Phone({ name, className, sizes = '(min-width: 1024px) 280px, 60vw', preload }: { name: ScreenName; className?: string; sizes?: string; preload?: boolean }) {
  return (
    <figure className={`${s.phone} ${className ?? ''}`} role="img" aria-label={SCREEN_ALT[name]}>
      <div className={s.phoneScreen}>
        <span className={s.island} aria-hidden="true" />
        <Image src={screen(name)} alt="" fill sizes={sizes} preload={preload} className={s.img} />
      </div>
    </figure>
  );
}

