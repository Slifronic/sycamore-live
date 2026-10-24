import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from './db';
import type { Org } from './types';

// Demo-grade coordinator sign-in from the contract: a 6-digit PIN sets the
// httpOnly `oid` cookie. Real auth (magic links) is out of scope this weekend.

export async function currentOrg(): Promise<Org | null> {
  const oid = (await cookies()).get('oid')?.value;
  if (!oid || !/^[0-9a-f-]{36}$/.test(oid)) return null;
  const [org] = (await sql`select * from org where id = ${oid}`) as unknown as Org[];
  return org ?? null;
}

export async function requireOrg(): Promise<Org> {
  const org = await currentOrg();
  if (!org) redirect('/org/login');
  return org;
}

export async function setOrgCookie(orgId: string) {
  (await cookies()).set('oid', orgId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}

export async function clearOrgCookie() {
  (await cookies()).delete('oid');
}
