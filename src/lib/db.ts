import 'server-only';
import postgres from 'postgres';

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

// One pool per server process; survives hot reloads in dev.
export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL ?? 'postgres://localhost:5432/sycamore_live', {
    max: 5,
    types: { numeric: { to: 1700, from: [1700], serialize: String, parse: Number } } as never,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;
