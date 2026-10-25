import { requireOrg } from '@/lib/session';
import { listAutomations } from '@/lib/messages';
import { fmtDay, fmtTime } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Help } from '../Help';
import { Stagger } from '@/components/motion/Stagger';
import { Icon } from '@/components/shell/icons';
import { AutomationRow } from './AutomationForm';
import s from '../messages.module.css';

export const metadata = { title: 'Automatic messages' };

export default async function AutomationsPage() {
  const org = await requireOrg();
  const rules = await listAutomations(org);
  const on = rules.filter((r) => r.enabled).length;

  return (
    <Stagger className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`${on} of ${rules.length} on`}
        title="Automations"
        lede="Messages that send themselves when something happens at your events."
        help={
          <Help label="How automations run" placement="bottom-end">
            <p>
              <strong>Each person gets each message once,</strong> and every number in it comes from your verified records.
            </p>
            <p>For the demo they run when you press “Run now”. Deployed, they run every 15 minutes. “Due” is who would get one right now.</p>
            <p>Reminders, invites and thank-yous only reach volunteers who opted in to announcements. “Forgot to check out” and “Hours verified” reach everyone they concern.</p>
          </Help>
        }
      />
      <ul className={`card ${s.autoList}`}>
        {rules.map((r) => (
          <AutomationRow
            key={r.key}
            id={r.key}
            name={r.name}
            trigger={r.trigger}
            enabled={r.enabled}
            body={r.body}
            allowed={r.allowed}
            due={r.due}
            sent={r.sent}
            optInOnly={!r.transactional}
            lastRun={r.last_run_at ? `${fmtDay(r.last_run_at)}, ${fmtTime(r.last_run_at)}` : null}
            flow={
              <div className={s.flow} aria-label={`How “${r.name}” works`}>
                <div className={`${s.step} ${s.stepTrigger}`}>
                  <span className={s.stepIcon} aria-hidden>
                    <Icon name="live" size={16} />
                  </span>
                  <div>
                    <div className={s.stepKind}>Trigger</div>
                    <div>When: {r.trigger}</div>
                  </div>
                </div>
                <span className={s.link} aria-hidden />
                <div className={s.step}>
                  <span className={s.stepIcon} aria-hidden>
                    <Icon name="hourglass" size={16} />
                  </span>
                  <div>
                    <div className={s.stepKind}>Wait</div>
                    <div>{r.wait}</div>
                  </div>
                </div>
                <span className={s.link} aria-hidden />
                <div className={s.step}>
                  <span className={s.stepIcon} aria-hidden>
                    <Icon name="route" size={16} />
                  </span>
                  <div>
                    <div className={s.stepKind}>Then</div>
                    <div>{r.condition}</div>
                  </div>
                </div>
              </div>
            }
          />
        ))}
      </ul>
    </Stagger>
  );
}

export const instant = false;
