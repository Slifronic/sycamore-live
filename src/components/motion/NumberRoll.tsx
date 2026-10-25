import s from './motion.module.css';

/**
 * A number whose digits roll like an odometer when it changes (a live total,
 * a filter count). The first render is the true value with no motion, so it
 * is right without JavaScript and in print; each later change slides every
 * changed digit to its new place (320ms, ease-out). Reduced motion: instant.
 * Screen readers get the formatted value once.
 *
 * Works in server and client components; it animates when a client parent
 * re-renders it with a new value.
 *
 *   <NumberRoll value={hereNow} />
 *   <NumberRoll value={hours} decimals={1} suffix=" hrs" className="figure" />
 */
export function NumberRoll({ value, decimals = 0, prefix = '', suffix = '', className = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const text = value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const chars = text.split('');
  return (
    <span className={`${s.roll} num ${className}`}>
      <span className="sr-only">{prefix + text + suffix}</span>
      <span aria-hidden className={s.rollTrack}>
        {prefix}
        {chars.map((c, i) => {
          // Key from the right so the ones digit keeps its column when the number grows.
          const key = chars.length - i;
          if (!/\d/.test(c))
            return (
              <span key={`s${key}`} className={s.rollSym}>
                {c}
              </span>
            );
          return (
            <span key={`d${key}`} className={s.rollCol}>
              <span className={s.rollStrip} style={{ transform: `translateY(${-Number(c) * 10}%)` }}>
                {'0123456789'.split('').map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          );
        })}
        {suffix}
      </span>
    </span>
  );
}
