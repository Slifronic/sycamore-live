import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Fetch a URL a coordinator pasted (a calendar feed, a maps short link)
// without letting it reach this machine or the private network: public
// http(s) hosts only, every redirect re-checked, a size cap and a timeout.

export class FetchBlocked extends Error {}

function privateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  );
}

function privateIp(ip: string): boolean {
  if (isIP(ip) === 4) return privateV4(ip);
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return privateV4(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('ff');
}

async function checkHost(url: URL, allowHosts?: (host: string) => boolean) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new FetchBlocked('Only web links (https://) can be fetched.');
  if (url.username || url.password) throw new FetchBlocked('Links with a password in them aren’t allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (allowHosts && !allowHosts(host)) throw new FetchBlocked('That link goes somewhere unexpected.');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new FetchBlocked('That address isn’t on the public internet.');
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new FetchBlocked('Couldn’t find that website.');
  if (addrs.some((a) => privateIp(a.address))) throw new FetchBlocked('That address isn’t on the public internet.');
}

/** Resolve redirects only (no body), e.g. to expand maps.app.goo.gl short links. */
export async function finalUrl(raw: string, opts: { allowHosts?: (host: string) => boolean; maxHops?: number } = {}): Promise<string> {
  let url = new URL(raw);
  for (let hop = 0; hop <= (opts.maxHops ?? 4); hop++) {
    await checkHost(url, hop === 0 ? opts.allowHosts : undefined);
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'user-agent': UA } });
    const loc = res.headers.get('location');
    await res.body?.cancel();
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    return url.toString();
  }
  return url.toString();
}

// OpenStreetMap's search asks every app to identify itself.
export const UA = `SycaMoreLive/0.1 (Cal Hacks 13.0 student project; ${process.env.NEXT_PUBLIC_APP_URL ?? 'local'})`;

/** GET text from a public URL, following up to 4 redirects, at most `maxBytes`. */
export async function fetchText(raw: string, opts: { maxBytes?: number; accept?: string } = {}): Promise<{ text: string; contentType: string; url: string }> {
  const maxBytes = opts.maxBytes ?? 2_000_000;
  let url = new URL(raw);
  for (let hop = 0; hop <= 4; hop++) {
    await checkHost(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': UA, accept: opts.accept ?? 'text/calendar, text/plain;q=0.9, */*;q=0.5' },
    });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel();
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new FetchBlocked(res.status === 404 ? 'Nothing at that address (404).' : res.status === 401 || res.status === 403 ? 'That calendar is private. Use its secret iCal address instead.' : `The site answered with an error (${res.status}).`);
    }
    const reader = res.body?.getReader();
    if (!reader) return { text: '', contentType: res.headers.get('content-type') ?? '', url: url.toString() };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new FetchBlocked('That calendar is too big to read here.');
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.length;
    }
    return { text: new TextDecoder().decode(buf), contentType: res.headers.get('content-type') ?? '', url: url.toString() };
  }
  throw new FetchBlocked('Too many redirects.');
}
