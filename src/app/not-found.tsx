import Image from 'next/image';
import Link from 'next/link';
import { Leaf } from '@/components/media/Leaf';

// Any link that doesn't lead anywhere: a mistyped /c/, /w/ or /e/ address, an
// old walk-in QR after the coordinator made a new one, or a page that was taken down.
export default function NotFound() {
  return (
    <main className="nf-page">
      <div className="nf-inner">
        <Link href="/" className="nf-brand">
          <Leaf size={20} color="var(--canopy)" veins={null} /> SycaMore Live
        </Link>
        <div className="nf-illo rise" aria-hidden>
          <Image src="/media/illo/compass-sm.webp" alt="" fill sizes="180px" className="nf-img" priority />
        </div>
        <h1 className="nf-title rise" style={{ ['--d' as string]: '0.08s' }}>
          This link doesn’t lead anywhere
        </h1>
        <p className="nf-lede rise" style={{ ['--d' as string]: '0.14s' }}>
          It may be mistyped, or the page was taken down. If someone gave you this link at an event, ask the coordinator for a fresh one.
        </p>
        <p className="nf-actions rise" style={{ ['--d' as string]: '0.2s' }}>
          <Link href="/" className="btn btn-primary btn-big">
            Go to SycaMore Live
          </Link>
          <Link href="/me" className="btn btn-big">
            My hours
          </Link>
        </p>
      </div>
    </main>
  );
}
