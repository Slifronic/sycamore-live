import { Icon, type IconName } from '../shell/icons';
import { LiveTimer } from './LiveTimer';
import s from './product.module.css';

// The hero's product visual: the coordinator home, drawn in HTML with the
// app's own tokens, so it is sharp at any size, follows the theme, and reads
// as the product even before an image could load. Everything scales off the
// container's width (like a screenshot would), and the numbers are the demo
// seed's made-up organization. A phone with a volunteer's verified record
// sits over its corner.

const RAIL: { icon: IconName; on?: boolean; count?: number }[] = [
  { icon: 'home', on: true },
  { icon: 'calendar', count: 1 },
  { icon: 'users' },
  { icon: 'message' },
  { icon: 'report' },
];

function Spark({ d }: { d: string }) {
  return (
    <svg className={s.spark} viewBox="0 0 64 22" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductMock() {
  return (
    <div className={s.stage}>
      <div className={s.window} role="img" aria-label="The coordinator home in SycaMore Live: one event waiting to be verified, verified hours, volunteers and events verified within a day, and the event happening now with its check-in code. Demo data with made-up names.">
        <div className={s.chrome} aria-hidden="true">
          <span className={s.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={s.url}>sycamore-live.vercel.app/org</span>
        </div>
        <div className={s.app} aria-hidden="true">
          <div className={s.rail}>
            <span className={s.railBrand}>RR</span>
            {RAIL.map((r) => (
              <span key={r.icon} className={`${s.railItem} ${r.on ? s.railOn : ''}`}>
                <Icon name={r.icon} size={20} />
                {r.count ? <b className={s.railCount}>{r.count}</b> : null}
              </span>
            ))}
          </div>
          <div className={s.main}>
            <div className={s.top}>
              <div>
                <p className={s.org}>Riverside Restoration Crew</p>
                <p className={s.orgSub}>Nonprofit</p>
              </div>
              <span className={s.search}>
                <Icon name="search" size={16} /> Search <kbd>⌘K</kbd>
              </span>
              <span className={s.newBtn}>
                <Icon name="plus" size={16} /> New
              </span>
            </div>

            <div className={s.welcome}>
              <div>
                <p className={s.date}>Sunday, October 25</p>
                <p className={s.hello}>Good morning, Sam</p>
                <p className={s.needs}>1 event is waiting for you to verify it.</p>
              </div>
              <span className={s.verifyBtn}>Verify Phase 2</span>
            </div>

            <div className={s.stats}>
              <div className={s.stat}>
                <p className={s.statLabel}>Verified hours · 30 days</p>
                <p className={s.statNum}>
                  489 <span className={s.delta}>+48</span>
                </p>
                <Spark d="M1 18 L12 15 L22 16 L32 10 L42 11 L52 6 L63 3" />
              </div>
              <div className={s.stat}>
                <p className={s.statLabel}>Unique volunteers</p>
                <p className={s.statNum}>
                  105 <span className={s.delta}>+12</span>
                </p>
                <Spark d="M1 17 L12 16 L22 12 L32 13 L42 9 L52 8 L63 5" />
              </div>
              <div className={`${s.stat} ${s.statHide}`}>
                <p className={s.statLabel}>Verified within 24 h</p>
                <p className={s.statNum}>
                  3<small> of 4</small>
                </p>
                <Spark d="M1 14 L16 14 L26 9 L40 9 L50 6 L63 6" />
              </div>
            </div>

            <div className={s.bottom}>
            <div className={s.live}>
              <p className={s.liveTag}>
                <span className={s.liveDot} /> Happening now
              </p>
              <p className={s.liveTitle}>Guadalupe River Cleanup</p>
              <div className={s.liveRow}>
                <span>
                  <b className={s.liveNum}>5</b> here now
                </span>
                <span className={s.code}>PLANT2</span>
              </div>
            </div>
            <div className={s.chart}>
              <p className={s.statLabel}>Hours by event</p>
              <div className={s.bars}>
                {[135, 144, 156, 174, 0].map((h, i) => (
                  <span key={i} style={{ ['--h' as string]: h ? `${(h / 174) * 100}%` : '8%' }} className={h ? '' : s.barWait} />
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.phone} role="img" aria-label="A volunteer’s phone: checked in to Guadalupe River Cleanup with a running timer, above their verified record from Santa Teresa Planting.">
        <div className={s.phoneInner} aria-hidden="true">
          <p className={s.pEyebrow}>
            <span className={s.liveDot} /> Checked in
          </p>
          <p className={s.pTitle}>Guadalupe River Cleanup</p>
          <p className={s.pTimer}>
            <LiveTimer startOffset={1 * 3600 + 42 * 60 + 10} />
          </p>
          <span className={s.pBtn}>Check out</span>
          <div className={s.pRecord}>
            <p className={s.pVerified}>
              <Icon name="check" size={16} /> Verified
            </p>
            <p className={s.pEvent}>Santa Teresa Planting</p>
            <p className={s.pHours}>
              3 <small>hours</small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
