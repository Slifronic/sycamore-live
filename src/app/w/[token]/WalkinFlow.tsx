'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import s from './walkin.module.css';

export type WalkinAttendance = { id: string; status: string; checked_in_at: string | null; checked_out_at: string | null };

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });
const first = (name: string) => name.split(/\s+/)[0] ?? name;

// The ID token's payload, decoded only to greet the person by name while they
// add their birth date. The server verifies the token with Google itself.
function nameFromCredential(credential: string): string {
  try {
    const json = atob(credential.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json) as { given_name?: string; name?: string }).given_name ?? '';
  } catch {
    return '';
  }
}

export function WalkinFlow(props: {
  token: string;
  open: boolean;
  closedMessage: string;
  orgName: string;
  coordinator: string;
  googleClientId: string | null;
  returning: { name: string; is_minor: boolean } | null;
  attendance: WalkinAttendance | null;
}) {
  const [att, setAtt] = useState<WalkinAttendance | null>(props.attendance);
  const [who, setWho] = useState<{ name: string; is_minor: boolean; is_new: boolean } | null>(
    props.returning ? { ...props.returning, is_new: false } : null,
  );
  const [someoneElse, setSomeoneElse] = useState(false);
  const [googleCred, setGoogleCred] = useState<string | null>(null); // held while a new Google user adds a birth date
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError('');
      try {
        const res = await fetch(`/api/walkin/${props.token}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data.need === 'date_of_birth' && body.mode === 'google') {
          setGoogleCred(String(body.credential));
          return;
        }
        if (!res.ok) {
          setError(data.error ?? 'That didn’t go through. Try again, or ask the coordinator to add you by name.');
          return;
        }
        setGoogleCred(null);
        setWho({ name: data.volunteer.name, is_minor: data.is_minor, is_new: data.is_new });
        setAtt(data.attendance);
      } catch {
        setError('No connection. Move closer to the sign-in table and try again.');
      } finally {
        setBusy(false);
      }
    },
    [props.token],
  );

  // Checked in already: the live session screen.
  if (att && who) return <Session att={att} name={who.name} isMinor={who.is_minor} isNew={who.is_new} orgName={props.orgName} onChange={setAtt} />;
  if (att && !who) return null;

  if (!props.open) {
    return (
      <section className={s.card}>
        <h2 className={s.h2}>Sign-up at the door is closed</h2>
        <p>{props.closedMessage}</p>
      </section>
    );
  }

  const known = props.returning && !someoneElse;

  return (
    <section className={s.card} aria-busy={busy}>
      {known ? (
        <div className={s.stack}>
          <h2 className={s.h2}>Welcome back, {first(props.returning!.name)}</h2>
          <p className={s.muted}>You signed up on this phone before. One tap and you’re checked in.</p>
          <button className={`${s.btn} ${s.primary}`} disabled={busy} onClick={() => submit({ mode: 'returning' })}>
            {busy ? 'Checking you in…' : 'Check in'}
          </button>
          <button className={s.link} onClick={() => setSomeoneElse(true)}>
            Not {first(props.returning!.name)}? Sign up as someone else
          </button>
        </div>
      ) : googleCred ? (
        <BirthDateStep
          greeting={nameFromCredential(googleCred)}
          busy={busy}
          onSubmit={(dob) => submit({ mode: 'google', credential: googleCred, date_of_birth: dob })}
          onCancel={() => setGoogleCred(null)}
        />
      ) : (
        <div className={s.stack}>
          <h2 className={s.h2}>New here? Sign up and check in</h2>
          <p className={s.muted}>No password, no app. Takes under a minute.</p>
          {props.googleClientId && (
            <>
              <GoogleButton clientId={props.googleClientId} disabled={busy} onCredential={(credential) => submit({ mode: 'google', credential })} />
              <p className={s.or}>
                <span>or with your email</span>
              </p>
            </>
          )}
          <EmailForm busy={busy} onSubmit={(f) => submit({ mode: 'email', ...f })} />
        </div>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <p className={s.fine}>
        We keep your name, email and birth date so {props.orgName} can confirm your hours. Your birth date is only used to check you’re 13 or older and whether a parent needs to OK sharing.
      </p>
    </section>
  );
}

function EmailForm({ busy, onSubmit }: { busy: boolean; onSubmit: (f: { name: string; email: string; date_of_birth: string }) => void }) {
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({ name: String(f.get('name') ?? ''), email: String(f.get('email') ?? ''), date_of_birth: String(f.get('dob') ?? '') });
      }}
    >
      <label className={s.field}>
        <span>Your name</span>
        <input className={s.input} name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="As you want it on your record" />
      </label>
      <label className={s.field}>
        <span>Email</span>
        <input className={s.input} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required />
      </label>
      <label className={s.field}>
        <span>Date of birth</span>
        <input className={s.input} name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} />
      </label>
      <button className={`${s.btn} ${s.primary}`} disabled={busy}>
        {busy ? 'Signing you up…' : 'Sign up and check in'}
      </button>
    </form>
  );
}

function BirthDateStep(props: { greeting: string; busy: boolean; onSubmit: (dob: string) => void; onCancel: () => void }) {
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit(String(new FormData(e.currentTarget).get('dob') ?? ''));
      }}
    >
      <h2 className={s.h2}>{props.greeting ? `Hi ${props.greeting}, one more thing` : 'One more thing'}</h2>
      <p className={s.muted}>Your date of birth. Google doesn’t share it, and volunteers have to be 13 or older.</p>
      <label className={s.field}>
        <span>Date of birth</span>
        <input className={s.input} name="dob" type="date" required autoFocus max={new Date().toISOString().slice(0, 10)} />
      </label>
      <button className={`${s.btn} ${s.primary}`} disabled={props.busy}>
        {props.busy ? 'Checking you in…' : 'Check in'}
      </button>
      <button type="button" className={s.link} onClick={props.onCancel}>
        Use a different account
      </button>
    </form>
  );
}

// "Sign in with Google" via Google Identity Services. Renders nothing until
// Google's script loads; the email form below always works without it.
function GoogleButton({ clientId, disabled, onCredential }: { clientId: string; disabled: boolean; onCredential: (c: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  useEffect(() => {
    cb.current = onCredential;
  }, [onCredential]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const render = () => {
      const g = window.google?.accounts.id;
      if (!g || !box.current) return;
      g.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential), ux_mode: 'popup', auto_select: false });
      g.renderButton(box.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300, logo_alignment: 'center' });
    };
    if (window.google?.accounts.id) return render();
    let script = document.querySelector<HTMLScriptElement>('script[data-gsi]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.gsi = '1';
      document.head.appendChild(script);
    }
    const onError = () => setFailed(true);
    script.addEventListener('load', render);
    script.addEventListener('error', onError);
    return () => {
      script.removeEventListener('load', render);
      script.removeEventListener('error', onError);
    };
  }, [clientId]);

  if (failed) return <p className={s.muted}>Google sign-in didn’t load. Use your email below.</p>;
  return <div ref={box} className={s.google} style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined} />;
}

function Session(props: { att: WalkinAttendance; name: string; isMinor: boolean; isNew: boolean; orgName: string; onChange: (a: WalkinAttendance) => void }) {
  const { att } = props;
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<null | 'sending' | 'queued'>(null);
  const [error, setError] = useState('');
  const tapped = useRef<string | null>(null);

  useEffect(() => {
    if (att.status !== 'checked_in') return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [att.status]);

  const checkOut = useCallback(async () => {
    tapped.current ??= new Date().toISOString(); // a retry keeps the time of the first tap
    setSaving('sending');
    setError('');
    try {
      const res = await fetch('/api/vol/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attendance_id: att.id, client_time: tapped.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaving(null);
        setError(data.error ?? 'That didn’t go through. Ask the coordinator to check you out.');
        return;
      }
      setSaving(null);
      props.onChange({ ...att, ...data.attendance });
    } catch {
      setSaving('queued'); // no signal: keep the tap time and retry
    }
  }, [att, props]);

  useEffect(() => {
    if (saving !== 'queued') return;
    const iv = setTimeout(checkOut, 5000);
    return () => clearTimeout(iv);
  }, [saving, checkOut]);

  if (att.status !== 'checked_in') {
    return (
      <section className={s.card}>
        <p className={s.badge}>✓ Checked out{att.checked_out_at ? ` at ${clock(att.checked_out_at)}` : ''}</p>
        <h2 className={s.h2}>Thanks, {first(props.name)}</h2>
        <p>{props.orgName} confirms everyone’s hours when the event closes. After that, your record is ready to share.</p>
      </section>
    );
  }

  const mins = att.checked_in_at ? Math.max(0, Math.floor((now - Date.parse(att.checked_in_at)) / 60_000)) : 0;
  return (
    <section className={s.card}>
      <p className={s.badge}>✓ Checked in{att.checked_in_at ? ` at ${clock(att.checked_in_at)}` : ''}</p>
      <h2 className={s.h2}>{props.isNew ? `You’re signed up, ${first(props.name)}` : `You’re here, ${first(props.name)}`}</h2>
      <p className={s.timer} aria-live="off">
        {Math.floor(mins / 60)}<span>h</span> {String(mins % 60).padStart(2, '0')}<span>m</span>
      </p>
      <p className={s.muted}>The coordinator can see you on the roster now. Tap Check out when you leave, so your hours count.</p>
      <button className={`${s.btn} ${s.primary}`} disabled={saving === 'sending'} onClick={checkOut}>
        {saving === 'sending' ? 'Checking you out…' : 'Check out'}
      </button>
      {saving === 'queued' && (
        <p className={s.notice} role="status">
          Saved on this phone. It will send when you have signal, with the time you tapped.
        </p>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <p className={s.fine}>
        You can close this page. To check out later, scan the same QR code or open this link again on this phone.
        {props.isMinor && ' Because you’re under 18, sharing your record will need a parent or guardian’s OK.'}
      </p>
    </section>
  );
}
