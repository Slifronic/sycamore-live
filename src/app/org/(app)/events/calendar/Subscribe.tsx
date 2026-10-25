'use client';

import { Popover } from '@/components/ui/Popover';
import { Icon } from '@/components/shell/icons';
import { CopyField } from '@/components/events/CopyField';
import s from './calendar.module.css';

/** "Subscribe": the calendar-app links and the raw feed address, in one popover. */
export function Subscribe({ feeds, tag }: { feeds: { google: string; webcal: string; outlook: string; https: string }; tag: string | null }) {
  return (
    <Popover
      label="Subscribe to this calendar"
      placement="bottom-end"
      panelClassName={s.subPanel}
      trigger={(p) => (
        <button type="button" className="btn" {...p}>
          <Icon name="calendar-plus" size={16} /> Subscribe
        </button>
      )}
    >
      <div className={s.subBody}>
        <p className={s.subTitle}>Subscribe{tag ? ` to “${tag}”` : ''}</p>
        <p className={s.subHint}>Stays in sync with your calendar app. Practice events never appear.</p>
        <div className={s.subApps}>
          <a className="btn btn-sm" href={feeds.google} target="_blank" rel="noopener">
            Google
          </a>
          <a className="btn btn-sm" href={feeds.webcal}>
            Apple
          </a>
          <a className="btn btn-sm" href={feeds.outlook} target="_blank" rel="noopener">
            Outlook
          </a>
        </div>
        <CopyField label="Address for any other app" value={feeds.https} />
      </div>
    </Popover>
  );
}
