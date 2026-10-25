'use client';

import { Children, useEffect, useRef, type ElementType, type ReactNode } from 'react';
import s from './motion.module.css';

// Port of the asset library's reveal.md (and animated-group for staggers).
// The content ships visible. Only JavaScript adds the hidden class, only to an
// element that is still below the fold, and never under reduced motion, so a
// failed script or a crawler always gets the whole page.

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Crawlers, headless captures and automation never scroll, so an element they
// would only reach by scrolling must not start hidden for them. Full-page
// screenshots and print render the whole document without moving the viewport.
const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|prerender/i;
const noReveal = () =>
  typeof navigator === 'undefined' || navigator.webdriver || BOT.test(navigator.userAgent) || window.matchMedia('print').matches;

function showAll() {
  document.querySelectorAll<HTMLElement>(`.${s.reveal}`).forEach((n) => {
    n.style.transitionDelay = '';
    n.classList.add(s.in);
  });
}
// One listener for the page: printing (or "Save as PDF") shows every section.
let printHooked = false;
function hookPrint() {
  if (printHooked) return;
  printHooked = true;
  window.addEventListener('beforeprint', showAll);
}

function arm(node: HTMLElement, delay: number, onCleanup: (fn: () => void) => void) {
  if (reduced() || noReveal()) return;
  if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;
  hookPrint();
  node.classList.add(s.reveal);
  if (delay) node.style.transitionDelay = `${delay}ms`;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      node.classList.add(s.in);
      io.disconnect();
      // Drop the delay once it has played so hover transitions stay snappy.
      window.setTimeout(() => (node.style.transitionDelay = ''), delay + 700);
    },
    // Start just before the element reaches the fold, so the rise is under
    // way as it arrives and a fast scroll never lands on a blank band.
    { threshold: 0, rootMargin: '0px 0px 12% 0px' },
  );
  io.observe(node);
  onCleanup(() => io.disconnect());
}

export function Reveal({
  children,
  as: As = 'div',
  className,
  delay = 0,
  id,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const cleanups: (() => void)[] = [];
    arm(node, delay, (fn) => cleanups.push(fn));
    return () => cleanups.forEach((fn) => fn());
  }, [delay]);
  return (
    <As ref={el} className={className} id={id}>
      {children}
    </As>
  );
}

/** Staggers its direct children in, 70 ms apart (animated-group's container/item shape). */
export function RevealGroup({
  children,
  as: As = 'div',
  className,
  step = 70,
  itemClassName,
  itemAs: ItemAs = 'div',
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  step?: number;
  itemClassName?: string;
  itemAs?: ElementType;
}) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const cleanups: (() => void)[] = [];
    Array.from(node.children).forEach((child, i) => arm(child as HTMLElement, i * step, (fn) => cleanups.push(fn)));
    return () => cleanups.forEach((fn) => fn());
  }, [step]);
  return (
    <As ref={el} className={className}>
      {Children.map(children, (child) =>
        child == null ? null : <ItemAs className={itemClassName}>{child}</ItemAs>,
      )}
    </As>
  );
}
