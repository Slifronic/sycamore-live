'use client';

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { toast } from '@/components/shell/Toast';
import { Icon } from '@/components/shell/icons';
import { runAutomationsAction, saveAutomationAction } from '../actions';
import s from '../messages.module.css';

/**
 * One automation as a row: name, what triggers it, an on/off switch that
 * saves at once, and how many it has sent. The row expands to edit the
 * message (Save) and run it now; the flow diagram sits beside the editor.
 */
export function AutomationRow({
  id,
  name,
  trigger,
  enabled,
  body,
  allowed,
  due,
  sent,
  optInOnly,
  lastRun,
  flow,
}: {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  body: string;
  allowed: string[];
  due: number;
  sent: number;
  optInOnly: boolean;
  lastRun: string | null;
  flow: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saved, save, saving] = useActionState(saveAutomationAction, null);
  const [toggled, toggle, toggling] = useActionState(saveAutomationAction, null);
  const [ran, run, running] = useActionState(runAutomationsAction, null);
  const [on, setOn] = useState(enabled);
  const [text, setText] = useState(body);
  const dirty = text !== body;
  const panelId = useId();
  const toggleForm = useRef<HTMLFormElement>(null);

  // Confirmations are toasts; errors stay inline in the row.
  useEffect(() => {
    if (saved?.ok) toast.success(saved.ok);
  }, [saved]);
  useEffect(() => {
    if (toggled?.ok) toast.success(toggled.ok);
  }, [toggled]);
  // A failed switch flips back to the saved state (once per failed attempt).
  const [failSeen, setFailSeen] = useState(toggled);
  if (toggled?.error && toggled !== failSeen) {
    setFailSeen(toggled);
    setOn(enabled);
  }
  useEffect(() => {
    if (ran?.ok) toast.success(ran.ok);
  }, [ran]);

  const error = saved?.error ?? toggled?.error ?? ran?.error;

  return (
    <li className={s.autoRow} data-open={open || undefined}>
      <div className={s.autoHead}>
        <button type="button" className={s.autoExpand} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
          <Icon name="chevron-right" size={16} className={s.autoChev} />
          <span className={s.autoName}>
            <strong>{name}</strong>
            <span className={s.autoTrigger}>{trigger}</span>
          </span>
        </button>
        <span className={s.autoSent}>
          <b className="num">{sent.toLocaleString()}</b> sent
        </span>
        {/* The switch saves on its own, with the message as last saved. */}
        <form ref={toggleForm} action={toggle} className={s.autoToggle}>
          <input type="hidden" name="key" value={id} />
          <input type="hidden" name="body" value={body} />
          <label className={s.toggle}>
            <input
              type="checkbox"
              name="enabled"
              checked={on}
              disabled={toggling}
              onChange={(e) => {
                setOn(e.target.checked);
                requestAnimationFrame(() => toggleForm.current?.requestSubmit());
              }}
              aria-label={`${name}: ${on ? 'on' : 'off'}`}
            />
            <span className={s.toggleText}>{on ? 'On' : 'Off'}</span>
          </label>
        </form>
      </div>
      {error && !open && <p className={`notice notice-red small ${s.autoError}`}>{error}</p>}

      {open && (
        <div id={panelId} className={s.autoBody}>
          <form action={save} className={s.autoForm}>
            <input type="hidden" name="key" value={id} />
            {on && <input type="hidden" name="enabled" value="on" />}
            <div className="field">
              <label htmlFor={`body-${id}`} className="small">
                Message
              </label>
              <textarea id={`body-${id}`} name="body" className="input small" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
              <span className="hint">Fills in per person: {allowed.join(' ')}</span>
            </div>
            <p className={s.autoFacts}>
              <span>{optInOnly ? 'Only to volunteers who opted in to announcements' : 'Goes to everyone it concerns (a transactional notice)'}</span>
              {lastRun && <span>Last run {lastRun}</span>}
            </p>
            {error && <p className="notice notice-red small">{error}</p>}
            <div className={s.autoActions}>
              <button className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving…' : dirty ? 'Save changes' : 'Save'}
              </button>
              {!dirty && (
                <button type="submit" formAction={run} className="btn btn-sm" disabled={running}>
                  {running ? 'Running…' : 'Run now'}
                </button>
              )}
              <span className={s.autoDue}>{dirty ? 'Save to run with the new wording.' : due === 0 ? 'Nobody due right now.' : `${due} due now.`}</span>
            </div>
          </form>
          <div className={s.autoFlow}>{flow}</div>
        </div>
      )}
    </li>
  );
}
