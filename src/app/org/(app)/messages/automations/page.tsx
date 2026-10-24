import { requireOrg } from '@/lib/session';
import { listAutomations, unreadCount } from '@/lib/messages';
import { orgChatUnread } from '@/lib/event-chat';
import { fmtDay, fmtTime } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { MessagesTabs } from '../MessagesTabs';
import { AutomationForm } from './AutomationForm';
import s from '../messages.module.css';

export default async function AutomationsPage() {
  const org = await requireOrg();
  const [rules, unread, chatUnread] = await Promise.all([listAutomations(org), unreadCount(org.id), orgChatUnread(org.id)]);
  const on = rules.filter((r) => r.enabled).length;

  return (
    <div className="page" style={{ gap: 20 }}>
      <PageHeader
        eyebrow={`People · ${on} of ${rules.length} automations on`}
        title="Automations"
        lede="Messages that send themselves when something happens at your events. Each person gets each one once, and every number in it comes from your verified records."
        action={<MessagesTabs on="automations" unread={unread} chatUnread={chatUnread} />}
      />
      <p className="notice notice-amber small">
        For the demo these run when you press “Run now”. Deployed, they run every 15 minutes. “Due” is who would get a message right now.
      </p>
      <div className={s.autoGrid}>
        {rules.map((r) => (
          <article key={r.key} className={`card ${s.autoCard}`} aria-labelledby={`auto-${r.key}`}>
            <div className={s.autoInfo}>
              <div className="row between wrap">
                <h2 id={`auto-${r.key}`} style={{ fontSize: 18 }}>
                  {r.name}
                </h2>
                <span className={`chip ${r.enabled ? 'chip-green' : 'chip-ink'}`}>{r.enabled ? 'Running' : 'Off'}</span>
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
                  ⚑
                </span>
                <div>
                  <div className={s.stepKind}>Trigger</div>
                  <div>When: {r.trigger}</div>
                </div>
              </div>
              <span className={s.link} aria-hidden />
              <div className={s.step}>
                <span className={s.stepIcon} aria-hidden>
                  ◷
                </span>
                <div>
                  <div className={s.stepKind}>Step 1 · Wait</div>
                  <div>{r.wait}</div>
                </div>
              </div>
              <span className={s.link} aria-hidden />
              <div className={s.step}>
                <span className={s.stepIcon} aria-hidden>
                  ➤
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
                  ⑂
                </span>
                <div>
                  <div className={s.stepKind}>Step 3 · Then</div>
                  <div>{r.condition}</div>
                </div>
              </div>
              <span className={s.link} aria-hidden />
              <span className={s.endPill}>✓ End of flow</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export const instant = false;
