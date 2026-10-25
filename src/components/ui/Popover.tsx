'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { Icon, type IconName } from '../shell/icons';
import s from './ui.module.css';

export type Placement = 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start' | 'right-end' | 'right-start';

/** Props to spread on your trigger button. */
export type TriggerProps = {
  ref: Ref<HTMLButtonElement>;
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-haspopup': 'menu' | 'dialog';
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
};

// Shared open/close behaviour: outside press and Escape close and return focus
// to the trigger; focus moving out of the panel closes it.
function useDisclosure() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  const onBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && wrap.current && !wrap.current.contains(next)) close(false);
  };
  return { open, setOpen, close, wrap, trigger, panel, onBlur };
}

/**
 * A small floating panel anchored to a trigger (account details, a help
 * note, the notifications list). role="dialog"; focus moves into it on open.
 * Children may be a function that receives `close`.
 *
 *   <Popover label="Account" placement="bottom-end"
 *     trigger={(p) => <button className="btn" {...p}>Account</button>}>
 *     {(close) => <…/>}
 *   </Popover>
 */
export function Popover({
  trigger,
  children,
  label,
  placement = 'bottom-end',
  className = '',
  panelClassName = '',
}: {
  trigger: (p: TriggerProps) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  label: string;
  placement?: Placement;
  className?: string;
  panelClassName?: string;
}) {
  const id = useId();
  const { open, setOpen, close, wrap, trigger: triggerRef, panel, onBlur } = useDisclosure();
  useEffect(() => {
    if (!open) return;
    const first = panel.current?.querySelector<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
    (first ?? panel.current)?.focus();
  }, [open, panel]);
  return (
    <span ref={wrap} className={`${s.anchor} ${className}`} onBlur={onBlur}>
      {trigger({
        ref: triggerRef,
        'aria-expanded': open,
        'aria-controls': id,
        'aria-haspopup': 'dialog',
        onClick: () => setOpen((o) => !o),
        onKeyDown: () => {},
      })}
      {open && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          className={`${s.panel} ${panelClassName}`}
          data-placement={placement}
          onClick={(e) => {
            // Following a link inside closes the panel.
            if ((e.target as HTMLElement).closest('a[href]')) close(false);
          }}
        >
          {typeof children === 'function' ? children(() => close()) : children}
        </div>
      )}
    </span>
  );
}

export type MenuItem =
  | { label: ReactNode; href: string; icon?: IconName; hint?: ReactNode; meta?: ReactNode; current?: boolean; tone?: 'danger' }
  | { label: ReactNode; onSelect: () => void; icon?: IconName; hint?: ReactNode; meta?: ReactNode; tone?: 'danger' }
  | { heading: string }
  | 'separator';

/**
 * A menu of links and actions (the "+ New" menu, the rail's More). Keyboard:
 * Enter, Space or ↓ opens and focuses the first item (↑ the last); ↑/↓ move,
 * Home/End jump, Escape closes and returns focus, Tab closes.
 *
 *   <Menu label="Create" placement="bottom-end"
 *     trigger={(p) => <button className="btn btn-primary" {...p}>New</button>}
 *     items={[{ label: 'New event', href: '/org/events/new', icon: 'calendar-plus' }]} />
 */
export function Menu({
  trigger,
  items,
  label,
  placement = 'bottom-end',
  className = '',
  panelClassName = '',
  footer,
}: {
  trigger: (p: TriggerProps) => ReactNode;
  items: MenuItem[];
  label: string;
  placement?: Placement;
  className?: string;
  panelClassName?: string;
  /** Extra non-menu content under the items (e.g. a theme switch). */
  footer?: ReactNode;
}) {
  const id = useId();
  const { open, setOpen, close, wrap, trigger: triggerRef, panel, onBlur } = useDisclosure();
  const [focusAt, setFocusAt] = useState<'first' | 'last'>('first');

  const itemsEls = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  useEffect(() => {
    if (!open) return;
    const els = itemsEls();
    (focusAt === 'last' ? els.at(-1) : els[0])?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusAt(e.key === 'ArrowUp' ? 'last' : 'first');
      setOpen(true);
    }
  };
  const onTriggerClick = () => {
    setFocusAt('first');
    setOpen((o) => !o);
  };
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const els = itemsEls();
    const i = els.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      els[(n + els.length) % els.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(els.length - 1);
    else if (e.key === 'Tab') close(false);
  };

  return (
    <span ref={wrap} className={`${s.anchor} ${className}`} onBlur={onBlur}>
      {trigger({
        ref: triggerRef,
        'aria-expanded': open,
        'aria-controls': id,
        'aria-haspopup': 'menu',
        onClick: onTriggerClick,
        onKeyDown: onTriggerKey,
      })}
      {open && (
        <div ref={panel} className={`${s.panel} ${panelClassName}`} data-placement={placement} onKeyDown={onMenuKey}>
          <div id={id} role="menu" aria-label={label}>
            {items.map((it, i) => {
              if (it === 'separator') return <div key={i} className={s.menuSep} role="separator" />;
              if ('heading' in it)
                return (
                  <p key={i} className={s.menuHeading} role="presentation">
                    {it.heading}
                  </p>
                );
              const inner = (
                <>
                  {it.icon && <Icon name={it.icon} size={18} />}
                  <span className={s.menuLabel}>
                    <span>{it.label}</span>
                    {it.hint && <span className={s.menuHint}>{it.hint}</span>}
                  </span>
                  {it.meta != null && <span className={s.menuMeta}>{it.meta}</span>}
                </>
              );
              return 'href' in it ? (
                <Link
                  key={i}
                  href={it.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={s.menuItem}
                  data-tone={it.tone}
                  aria-current={it.current ? 'page' : undefined}
                  onClick={() => close(false)}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={s.menuItem}
                  data-tone={it.tone}
                  onClick={() => {
                    close();
                    it.onSelect();
                  }}
                >
                  {inner}
                </button>
              );
            })}
          </div>
          {footer}
        </div>
      )}
    </span>
  );
}
