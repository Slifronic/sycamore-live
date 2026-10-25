import Image from 'next/image';
import { Leaf } from '@/components/media/Leaf';
import s from './auth.module.css';

// The photo panel beside the coordinator's sign-in and set-up boxes (desktop only).
export function AuthArt({ line }: { line: string }) {
  return (
    <figure className={`${s.art} settle`} aria-hidden>
      <Image src="/media/photo/audience-coordinator.webp" alt="" fill priority sizes="(max-width: 960px) 0px, 460px" className={s.artImg} />
      <figcaption className={s.artCap}>
        <Leaf size={26} color="#eef4ef" veins="rgba(16,40,29,0.5)" />
        <span className="rise" style={{ ['--d' as string]: '0.2s' }}>
          {line}
        </span>
      </figcaption>
    </figure>
  );
}
