import s from './home.module.css';
import f from '@/components/vol/folders.module.css';

// Home skeleton: the hero number, one row, and two folders, in the same places.
export default function Loading() {
  return (
    <div className={s.page} aria-busy="true">
      <p className="sr-only" role="status">
        Loading
      </p>
      <div className={s.hero}>
        <span className="skel" style={{ width: 110, height: 12 }} />
        <span className="skel" style={{ width: 150, height: 72, borderRadius: 14 }} />
        <span className="skel" style={{ width: 220, height: 14 }} />
      </div>
      <div className={s.now}>
        <span className="skel" style={{ height: 72, borderRadius: 14 }} />
      </div>
      <div className={s.orgs}>
        <span className="skel" style={{ width: 200, height: 22, margin: '10px 0' }} />
        <div className={f.grid}>
          {[0, 1].map((i) => (
            <span key={i} className="skel" style={{ height: 196, borderRadius: 20, marginTop: 22 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
