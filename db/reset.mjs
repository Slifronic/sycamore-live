// Create the database named in DATABASE_URL (from the shell or .env.local) if
// it doesn't exist yet, then load the schema and the demo seed into it.
//   npm run db:reset
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = new URL(process.env.DATABASE_URL ?? 'postgres://localhost:5432/sycamore_live');
process.env.DATABASE_URL = url.toString();
const name = decodeURIComponent(url.pathname.slice(1));
if (!/^[\w-]+$/.test(name)) throw new Error(`Unexpected database name in DATABASE_URL: ${name}`);

// "already exists" is fine; anything else shows up when the seed connects.
spawnSync('createdb', ['-h', url.hostname, '-p', url.port || '5432', ...(url.username ? ['-U', decodeURIComponent(url.username)] : []), name], {
  stdio: 'ignore',
  env: { ...process.env, ...(url.password ? { PGPASSWORD: decodeURIComponent(url.password) } : {}) },
});
console.log(`Resetting ${name}…`);
await import('./seed.mjs');
