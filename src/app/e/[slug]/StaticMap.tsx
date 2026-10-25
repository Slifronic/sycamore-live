import s from './event-page.module.css';

// A still map of the meeting point, built from OpenStreetMap tiles. It replaces
// the OSM embed iframe, which drew its own zoom buttons and an attribution bar
// we couldn't wrap, and on phones sometimes painted tiles into only part of
// its box. Here the box is ours: a fixed aspect ratio at full card width, a
// pin at the centre, and an attribution line that wraps. The whole map links
// to the full OpenStreetMap page.

const TILE = 256;
const ZOOM = 15;
// Enough tiles to fill the widest card (760px) at its aspect ratio from any
// point inside the centre tile.
const SPAN_X = 2;
const SPAN_Y = 1;

function project(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n * TILE,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * TILE,
  };
}

export function StaticMap({ lat, lng, label, href }: { lat: number; lng: number; label: string; href: string }) {
  const { x, y } = project(lat, lng, ZOOM);
  const cx = Math.floor(x / TILE);
  const cy = Math.floor(y / TILE);
  const n = 2 ** ZOOM;
  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  for (let dy = -SPAN_Y; dy <= SPAN_Y; dy++) {
    for (let dx = -SPAN_X; dx <= SPAN_X; dx++) {
      const tx = (((cx + dx) % n) + n) % n;
      const ty = cy + dy;
      if (ty < 0 || ty >= n) continue;
      tiles.push({
        key: `${dx}:${dy}`,
        src: `https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`,
        left: Math.round((cx + dx) * TILE - x),
        top: Math.round(ty * TILE - y),
      });
    }
  }
  return (
    <figure className={s.mapBox}>
      <a className={s.mapLink} href={href} target="_blank" rel="noopener" aria-label={`Open a larger map of ${label} (OpenStreetMap)`}>
        <span className={s.mapTiles} aria-hidden>
          {tiles.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element -- third-party map tiles, already sized
            <img key={t.key} src={t.src} alt="" width={TILE} height={TILE} loading="lazy" decoding="async" draggable={false} style={{ left: `calc(50% + ${t.left}px)`, top: `calc(50% + ${t.top}px)` }} />
          ))}
        </span>
        <svg className={s.mapPin} width="30" height="40" viewBox="0 0 30 40" aria-hidden>
          <path d="M15 39s13-13.2 13-23.5C28 7.5 22.2 1.5 15 1.5S2 7.5 2 15.5C2 25.8 15 39 15 39z" />
          <circle cx="15" cy="15.5" r="5" />
        </svg>
      </a>
      <figcaption className={s.mapCredit}>
        Map ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
          OpenStreetMap contributors
        </a>
      </figcaption>
    </figure>
  );
}
