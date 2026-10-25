import s from './home.module.css';

// Home's skeleton has Home's shape: welcome and three stats, then the chart beside "now".
export default function Loading() {
  const block = (h: number, extra = '') => <span className={`skel ${extra}`} style={{ display: 'block', height: h, borderRadius: 14 }} aria-hidden />;
  return (
    <div className={s.home} aria-busy="true" aria-label="Loading">
      <div className={s.welcome} style={{ padding: 0 }}>{block(300)}</div>
      <div className={s.stat}>{block(300)}</div>
      <div className={s.stat}>{block(300)}</div>
      <div className={s.stat}>{block(300)}</div>
      <div className={s.chartCard} style={{ padding: 0 }}>{block(320)}</div>
      <div className={s.now} style={{ padding: 0, background: 'none', boxShadow: 'none' }}>{block(320)}</div>
    </div>
  );
}
