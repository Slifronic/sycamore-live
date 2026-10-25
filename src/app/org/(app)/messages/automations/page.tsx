import { requireOrg } from '@/lib/session';
import { listAutomations } from '@/lib/messages';
import { fmtDay, fmtTime } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Help } from '../Help';
import { Stagger } from '@/components/motion/Stagger';
import { Icon } from '@/components/shell/icons';
import { Chip } from '@/components/ui/Chip';
import { AutomationForm } from './AutomationForm';
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
        controls={
          <Help label="How automations run" placement="bottom-end">
            <p>
              <strong>Each person gets each message once,</strong> and every number in it comes from your verified records.
            </p>
            <p>For the demo they run when you press “Run now”. Deployed, they run every 15 minutes. “Due” is who would get one right now.</p>
          </Help>
        }
      />
      <div className={s.autoGrid}>
        {rules.map((r) => (
          <article key={r.key} className={`card ${s.autoCard}`} aria-labelledby={`auto-${r.key}`}>
            <div className={s.autoInfo}>
              <div className="row between wrap">
                <h2 id={`auto-${r.key}`} style={{ fontSize: 18 }}>
                  {r.name}
                </h2>
                <Chip tone={r.enabled ? 'green' : 'ink'} icon={r.enabled ? 'check' : undefined}>
                  {r.enabled ? 'Running' : 'Off'}
                </Chip>
              </div>
              <div className={s.stats}>
                <span className={s.stat}>
                  <span className="eyebrow">Sent so far</span>
                  <span className="figure">{r.sent.toLocaleString()}</span>
                </span>
                <span className={s.stat}>
                  <span className="eyebrow">Due now</span>
                  <span className="figure" style={{ color: r.due ? 'var(--amber)' : undefined }}>
                    {r.due.toLocaleString()}
                  </span>
                </span>
                {r.last_run_at && (
                  <span className={s.stat}>
                    <span className="eyebrow">Last run</span>
                    <span className="small">
                      {fmtDay(r.last_run_at)}, {fmtTime(r.last_run_at)}
                    </span>
                  </span>
                )}
              </div>
              <AutomationForm id={r.key} enabled={r.enabled} body={r.body} allowed={r.allowed} due={r.due} />
            </div>
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
                  <div className={s.stepKind}>Step 1 · Wait</div>
                  <div>{r.wait}</div>
                </div>
              </div>
              <span className={s.link} aria-hidden />
              <div className={s.step}>
                <span className={s.stepIcon} aria-hidden>
                  <Icon name="message" size={16} />
                </span>
                <div>
                  <div className={s.stepKind}>Step 2 · Send in-app message</div>
                  <div className="muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.body}
                  </div>
                </div>
              </div>
              <span className={s.link} aria-hidden />
              <div className={s.step}>
                <span className={s.stepIcon} aria-hidden>
                  <Icon name="route" size={16} />
                </span>
                <div>
                  <div className={s.stepKind}>Step 3 · Then</div>
                  <div>{r.condition}</div>
                </div>
              </div>
              <span className={s.link} aria-hidden />
              <span className={s.endPill}>
                <Icon name="check" size={14} strokeWidth={2} /> End of flow
              </span>
            </div>
          </article>
        ))}
      </div>
    </Stagger>
  );
}

export const instant = false;
