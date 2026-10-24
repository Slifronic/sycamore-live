import { randomInt } from 'node:crypto';

// No 0/O/1/I, so a code read off a projector can't be mistyped.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function checkinCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export function pin(): string {
  return String(randomInt(100000, 1000000));
}

// Share codes for records: SYC-XXXX-XXXX from the same alphabet, about 2^40
// possibilities, random rather than sequential so they can't be guessed.
export function shareCode(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `SYC-${group()}-${group()}`;
}

export const SHARE_CODE = /^SYC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
