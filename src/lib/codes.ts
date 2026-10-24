import { randomInt } from 'node:crypto';

// No 0/O/1/I, so a code read off a projector can't be mistyped.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function checkinCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export function pin(): string {
  return String(randomInt(100000, 1000000));
}
