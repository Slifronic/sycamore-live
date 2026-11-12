import 'server-only';
import postgres from 'postgres';

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

// One pool per server process; survives hot reloads in dev.
export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL ?? 'postgres://localhost:5432/sycamore_live', {
    // Each warm function instance holds its own pool, so many instances add up: keep it small
    // on Vercel. A connection the database dropped while an instance was frozen is closed
    // here first (idle_timeout) instead of failing the next query.
    max: process.env.VERCEL ? 3 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 600,
    types: { numeric: { to: 1700, from: [1700], serialize: String, parse: Number } } as never,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;
