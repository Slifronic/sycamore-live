import s from './marquee.module.css';

// Port of text-marquee.md. The items are in the track twice and it slides by
// exactly -50%, so the loop has no seam; spacing lives inside each item.
// Screen readers get the list once (visually hidden). The pause control is a
// checkbox so it works without JavaScript (WCAG 2.2.2). Reduced motion turns
// the strip into a static, wrapped list.

export function Marquee({ items, label }: { items: string[]; label: string }) {
  const track = [...items, ...items, ...items];
  return (
    <div className={s.marquee}>
      <ul className="sr-only" aria-label={label}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <label className={s.pause}>
        <input type="checkbox" />
        <span className={s.pauseOff}>Pause</span>
        <span className={s.pauseOn}>Play</span>
        <span className="sr-only"> the moving list of programs</span>
      </label>
      <div className={s.viewport} aria-hidden="true">
        <div className={s.track}>
          {[0, 1].map((copy) => (
            <div key={copy} className={s.copy} data-dup={copy === 1 || undefined}>
              {track.map((t, i) => (
                <span key={`${copy}-${i}`} className={s.item} data-dup={i >= items.length || undefined}>
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
