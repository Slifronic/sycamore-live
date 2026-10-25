'use client';

import Link from 'next/link';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Icon, type IconName } from './icons';
import s from './toast.module.css';

/**
 * Toasts: short confirmations that slide up from the bottom and leave on
 * their own (4.5s; hovering or focusing one pauses it). One <Toaster/> is
 * mounted in the root layout; call `toast()` from any client component.
 * Announced politely (errors assertively). Reduced motion: no slide.
 *
 *   toast('Event saved');
 *   toast.success('3 hours verified', { action: { label: 'Undo', onClick: undo } });
 *   toast.error('Couldn’t reach the server', { body: 'Check your connection and try again.' });
 *
 * From a server page (e.g. after a redirect with ?saved=1), render
 * <ToastOnMount message="Saved" /> once.
 */

export type ToastTone = 'neutral' | 'success' | 'warning' | 'error';
export type ToastAction = { label: string; href?: string; onClick?: () => void };
export type ToastInput = { title: string; body?: string; tone?: ToastTone; action?: ToastAction; duration?: number };
type Item = ToastInput & { id: number; leaving?: boolean };

let items: Item[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const set = (next: Item[]) => {
  items = next;
  emit();
};

export function dismissToast(id: number) {
  if (!items.some((t) => t.id === id && !t.leaving)) return;
  set(items.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
  setTimeout(() => set(items.filter((t) => t.id !== id)), 180);
}

function push(input: ToastInput) {
  const id = ++seq;
  set([...items.filter((t) => !t.leaving).slice(-2), { ...input, id }]);
  return id;
}

type Opts = Omit<ToastInput, 'title' | 'tone'>;
export const toast = Object.assign((title: string | ToastInput, opts: Opts = {}) => push(typeof title === 'string' ? { title, ...opts } : title), {
  success: (title: string, opts: Opts = {}) => push({ title, tone: 'success', ...opts }),
  warning: (title: string, opts: Opts = {}) => push({ title, tone: 'warning', ...opts }),
  error: (title: string, opts: Opts = {}) => push({ title, tone: 'error', ...opts }),
  dismiss: dismissToast,
});

const ICON: Record<ToastTone, IconName> = { neutral: 'info', success: 'check', warning: 'clock', error: 'alert' };

function ToastView({ t }: { t: Item }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const left = useRef(t.duration ?? (t.tone === 'error' ? 7000 : 4500));
  const started = useRef(0);
  const start = () => {
    started.current = Date.now();
    timer.current = setTimeout(() => dismissToast(t.id), left.current);
  };
  const pause = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    left.current = Math.max(800, left.current - (Date.now() - started.current));
  };
  useEffect(() => {
    start();
    return pause;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tone = t.tone ?? 'neutral';
  return (
    <li
      className={s.toast}
      data-tone={tone}
      data-leaving={t.leaving || undefined}
      role={tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <span className={s.icon} aria-hidden>
        <Icon name={ICON[tone]} size={16} strokeWidth={2} />
      </span>
      <div className={s.text}>
        <p className={s.title}>{t.title}</p>
        {t.body && <p className={s.body}>{t.body}</p>}
      </div>
      {t.action &&
        (t.action.href ? (
          <Link href={t.action.href} className={s.action} onClick={() => dismissToast(t.id)}>
            {t.action.label}
          </Link>
        ) : (
          <button
            type="button"
            className={s.action}
            onClick={() => {
              t.action?.onClick?.();
              dismissToast(t.id);
            }}
          >
            {t.action.label}
          </button>
        ))}
      <button type="button" className={s.close} aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
        <Icon name="x" size={16} />
      </button>
    </li>
  );
}

const EMPTY: Item[] = [];
export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => items,
    () => EMPTY,
  );
  // The live region is always in the page so the first toast is announced.
  return (
    <section className={`${s.region} no-print`} aria-label="Notifications" aria-live="polite">
      <ol className={s.list}>
        {list.map((t) => (
          <ToastView key={t.id} t={t} />
        ))}
      </ol>
    </section>
  );
}

const shown = new Set<string>();
/** Fire one toast when this mounts (once per `id` per page load). */
export function ToastOnMount({ message, body, tone = 'success', id }: { message: string; body?: string; tone?: ToastTone; id?: string }) {
  useEffect(() => {
    const key = id ?? message;
    if (shown.has(key)) return;
    shown.add(key);
    push({ title: message, body, tone });
  }, [message, body, tone, id]);
  return null;
}
