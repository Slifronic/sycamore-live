'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import s from './pricing.module.css';

// Planned pricing. The toggle is a two-option radio group; the price rolls
// to its new value (y + opacity only). Plans with no annual price stay
// monthly and say so, instead of inventing a discount.

type Plan = {
  name: string;
  monthly: number;
  annual?: number;
  blurb: string;
  features: string[];
  featured?: boolean;
  cta: { href: string; label: string };
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    monthly: 0,
    annual: 0,
    blurb: 'For a small group running its first events.',
    features: ['1 coordinator seat', '3 events a month', '25 checked-in volunteers a month', 'Records verifiable forever'],
    cta: { href: '/org/start', label: 'Start free' },
  },
  {
    name: 'Core',
    monthly: 49,
    annual: 490,
    blurb: 'For an organization with a regular calendar.',
    features: ['Unlimited events', '2 coordinator seats', 'Roster reporting', 'CSV export'],
    featured: true,
    cta: { href: '/org/start', label: 'Set up your organization' },
  },
  {
    name: 'Program',
    monthly: 129,
    blurb: 'For programs that report to funders.',
    features: ['5 coordinator seats', 'Funder summary PDF', 'Group events by program', 'Everything in Core'],
    cta: { href: '/org/start', label: 'Set up your organization' },
  },
  {
    name: 'Multi-site',
    monthly: 299,
    blurb: 'For organizations with several locations.',
    features: ['Unlimited seats', 'Locations', 'API export', 'Everything in Program'],
    cta: { href: '/org/start', label: 'Set up your organization' },
  },
];

function Price({ value, unit }: { value: number; unit: string }) {
  return (
    <span className={s.price}>
      <span className={s.currency}>$</span>
      <span className={s.roll}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: '70%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-70%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={s.amount}
          >
            {value.toLocaleString('en-US')}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className={s.unit}>{unit}</span>
    </span>
  );
}

export function PricingTable() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className={s.wrap}>
      <div className={s.toggle} role="radiogroup" aria-label="Billing period">
        {[
          { v: false, label: 'Monthly' },
          { v: true, label: 'Annual' },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={annual === o.v}
            className={s.opt}
            onClick={() => setAnnual(o.v)}
            onKeyDown={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                setAnnual((a) => !a);
                const sib = (e.currentTarget.nextElementSibling ?? e.currentTarget.previousElementSibling) as HTMLElement | null;
                sib?.focus();
              }
            }}
            tabIndex={annual === o.v ? 0 : -1}
          >
            {annual === o.v && <motion.span layoutId="billing-pill" className={s.pill} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <span className={s.optText}>
              {o.label}
              {o.v && <span className={s.save}>2 months free on Core</span>}
            </span>
          </button>
        ))}
      </div>

      <div className={s.grid}>
        {PLANS.map((p) => {
          const hasAnnual = p.annual != null;
          const showAnnual = annual && hasAnnual;
          const value = showAnnual ? p.annual! : p.monthly;
          return (
            <article key={p.name} className={`${s.card} ${p.featured ? s.featured : ''}`} aria-labelledby={`plan-${p.name}`}>
              {p.featured && <p className={s.flag}>Most organizations</p>}
              <h2 className={s.name} id={`plan-${p.name}`}>
                {p.name}
              </h2>
              <p className={s.blurb}>{p.blurb}</p>
              <p aria-live="polite">
                <Price value={value} unit={p.monthly === 0 ? 'forever' : showAnnual ? '/ year' : '/ month'} />
              </p>
              <p className={s.note}>
                {p.monthly === 0
                  ? 'No card, no trial clock.'
                  : showAnnual
                    ? `$${(p.annual! / 12).toFixed(2)} a month, billed yearly`
                    : annual
                      ? 'Monthly billing only, for now'
                      : hasAnnual
                        ? `or $${p.annual} a year`
                        : 'Billed monthly'}
              </p>
              <Link href={p.cta.href} className={`btn btn-big ${p.featured ? 'btn-primary' : ''} ${s.cta}`}>
                {p.cta.label}
              </Link>
              <ul className={s.features}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
