import 'server-only';

// Transactional email (sign-in codes). Sends through Resend when
// RESEND_API_KEY is set. In development without a key the message is printed
// to the server log instead, so sign-in still works locally.

export class MailError extends Error {}

export const emailReady = () => !!process.env.RESEND_API_KEY || process.env.NODE_ENV !== 'production';

export async function sendEmail(msg: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new MailError('Email isn’t set up (RESEND_API_KEY).');
    console.info(`[mail] to ${msg.to}: ${msg.subject}\n${msg.text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'SycaMore <no-reply@sycamore.app>',
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((e: unknown) => {
    console.error(JSON.stringify({ level: 'error', msg: 'mail_send_failed', reason: e instanceof Error ? e.message : String(e) }));
    return null;
  });
  if (!res) throw new MailError('Email failed (no connection).');
  if (!res.ok) {
    // Resend says why in the body (an unverified sending domain, a rejected key). Without it
    // the log only ever said "403". 401 and 403 mean the deployment is misconfigured and
    // nobody can receive a code until it is fixed.
    const body = (await res.text().catch(() => '')).slice(0, 400);
    console.error(JSON.stringify({
      level: res.status === 401 || res.status === 403 ? 'fatal' : 'error',
      msg: 'mail_send_failed', status: res.status, body,
    }));
    throw new MailError(`Email failed (${res.status}).`);
  }
}
