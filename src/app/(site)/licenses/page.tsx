import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cacheLife } from 'next/cache';
import { siteStyles as ss } from '@/components/site/Blocks';
import { Botanicals } from '@/components/site/Botanicals';
import { Rays } from '@/components/site/Rays';
import { LEGAL_UPDATED, LEGAL_UPDATED_ISO } from '@/components/site/Legal';
import { pageMeta } from '@/components/site/meta';
import l from './licenses.module.css';

export const metadata = pageMeta(
  'Open-source licenses',
  'The open-source packages SycaMore Live ships in production, with their versions and licenses, read from the project’s package-lock.json.',
  '/licenses',
);

type Pkg = { name: string; version: string; license: string; direct: boolean; optional: boolean };

// Read straight from package-lock.json, so the list can't drift from what is
// installed. Production packages only: anything the lockfile marks as dev is
// left out. Cached, so it's read once per deploy.
async function productionPackages(): Promise<Pkg[]> {
  'use cache';
  cacheLife('max');
  const root = process.cwd();
  const [lockRaw, pkgRaw] = await Promise.all([
    readFile(path.join(/*turbopackIgnore: true*/ root, 'package-lock.json'), 'utf8'),
    readFile(path.join(/*turbopackIgnore: true*/ root, 'package.json'), 'utf8'),
  ]);
  const lock = JSON.parse(lockRaw) as { packages: Record<string, { version?: string; license?: string | { type?: string }; dev?: boolean; optional?: boolean }> };
  const direct = new Set(Object.keys((JSON.parse(pkgRaw) as { dependencies?: Record<string, string> }).dependencies ?? {}));
  const seen = new Map<string, Pkg>();
  for (const [key, info] of Object.entries(lock.packages)) {
    if (!key || info.dev) continue;
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
    const license = typeof info.license === 'string' ? info.license : (info.license?.type ?? 'Not stated');
    const id = `${name}@${info.version}`;
    if (!seen.has(id)) seen.set(id, { name, version: info.version ?? '', license, direct: direct.has(name), optional: !!info.optional });
  }
  return [...seen.values()].sort((a, b) => Number(b.direct) - Number(a.direct) || a.name.localeCompare(b.name));
}

export default async function Licenses() {
  const pkgs = await productionPackages();
  const byLicense = new Map<string, number>();
  for (const p of pkgs) byLicense.set(p.license, (byLicense.get(p.license) ?? 0) + 1);
  const counts = [...byLicense.entries()].sort((a, b) => b[1] - a[1]);
  const directCount = pkgs.filter((p) => p.direct).length;

  return (
    <article className={l.page} aria-labelledby="page-title">
      <div className={l.mist} aria-hidden="true">
        <Rays />
        <Botanicals items={[{ kind: 'fern', right: 'max(16px, calc((100vw - 1240px) / 2 + 20px))', top: '36px', size: 150, rotate: 14, tone: 'soft' }]} />
      </div>
      <header className={`${ss.wrap} ${l.head}`}>
        <p className={ss.eyebrow}>Legal</p>
        <h1 className={l.title} id="page-title">
          Open-source licenses
        </h1>
        <p className={ss.lede}>SycaMore Live is built on open-source software. These are the packages it ships in production, and their licenses.</p>
        <p className={l.updated}>
          Read from <code>package-lock.json</code> · page dated <time dateTime={LEGAL_UPDATED_ISO}>{LEGAL_UPDATED}</time>
        </p>
      </header>

      <div className={`${ss.wrap} ${l.grid}`}>
        <aside className={l.summary} aria-label="Summary">
          <dl className={l.totals}>
            <div>
              <dt>Packages</dt>
              <dd>{pkgs.length}</dd>
            </div>
            <div>
              <dt>Direct</dt>
              <dd>{directCount}</dd>
            </div>
          </dl>
          <p className={l.sumTitle}>By license</p>
          <ul className={l.counts}>
            {counts.map(([lic, n]) => (
              <li key={lic}>
                <span>{lic}</span>
                <b>{n}</b>
              </li>
            ))}
          </ul>
          <p className={l.note}>
            Platform-specific builds (for example the image library’s native binaries) are marked “optional”: only the one for the server’s system is
            installed. Icons are adapted from Lucide (ISC). Fonts are Fraunces and Plus Jakarta Sans (SIL Open Font License).
          </p>
        </aside>

        <div className={l.tableWrap}>
          <table className={l.table}>
            <caption className="sr-only">Production packages, their versions and licenses</caption>
            <thead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Version</th>
                <th scope="col">License</th>
              </tr>
            </thead>
            <tbody>
              {pkgs.map((p) => (
                <tr key={`${p.name}@${p.version}`}>
                  <th scope="row">
                    <a href={`https://www.npmjs.com/package/${p.name}/v/${p.version}`} rel="noopener" target="_blank">
                      {p.name}
                    </a>
                    {p.direct && <span className={l.tag}>direct</span>}
                    {p.optional && <span className={`${l.tag} ${l.tagQuiet}`}>optional</span>}
                  </th>
                  <td className="num">{p.version}</td>
                  <td>{p.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
