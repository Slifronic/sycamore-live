'use client';

import s from './consent.module.css';

// The required agreement on /join and the walk-in page. 13 to 17 also confirm
// a parent or guardian knows (the birth date decides which line shows). Under
// 13 is refused by the server either way.

export function ageFrom(dob: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export const isTeen = (dob: string) => {
  const a = ageFrom(dob);
  return a !== null && a >= 13 && a < 18;
};

export function Consent({ dob, checked, onChange, big = false }: { dob: string; checked: boolean; onChange: (v: boolean) => void; big?: boolean }) {
  const teen = isTeen(dob);
  return (
    <label className={`${s.consent} ${big ? s.big : ''}`}>
      <input type="checkbox" name="consent" required checked={checked} onChange={(e) => onChange(e.target.checked)} className={s.box} />
      <span>
        I agree to the{' '}
        <a href="/terms" target="_blank" rel="noopener">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" target="_blank" rel="noopener">
          Privacy Policy
        </a>
        {teen ? <>, and a parent or guardian knows I’m using SycaMore</> : null}.
      </span>
    </label>
  );
}
