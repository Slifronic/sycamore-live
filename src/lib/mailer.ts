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
  }).catch(() => null);
  if (!res?.ok) throw new MailError(`Email failed (${res?.status ?? 'no connection'}).`);
}
