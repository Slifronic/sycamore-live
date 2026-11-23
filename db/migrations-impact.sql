-- Impact tracking (Nov 22, 2026). Idempotent: safe to run more than once, and
-- on the live database.
--   psql "$DATABASE_URL" -f db/migrations-impact.sql
--   npm run db:seed-opportunities      (fills opportunity.skills from the file)
-- schema.sql holds the same objects, so `npm run db:reset` needs nothing extra.
--
-- What the team's /impact page counts, and nothing more:
--   - visits: one row per day per hashed visitor. The hash is of the day, a
--     server secret, the address and the browser string; the address itself
--     is never stored, and the secret changes the hash every day, so a visitor
--     can't be followed from one day to the next.
--   - page and link counts per day (usage_day), by route, never by person.
--   - "I applied": a signed-in volunteer says they applied to a public
--     listing. It is self-reported and the page labels it that way.
--   - via: a short tag from a shared link (?via=bryant) so the team can see
--     which invitations brought people in. It names a link, not a person.
begin;

-- The skills a listing's work uses, in Discover's vocabulary
-- (src/lib/discover/taxonomy.ts). Empty when the file names none.
alter table opportunity add column if not exists skills text[] not null default '{}';

-- Which shared link a volunteer first arrived through.
alter table volunteer add column if not exists signup_via text check (signup_via is null or signup_via ~ '^[a-z0-9-]{1,32}$');

create table if not exists opportunity_application (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunity(id) on delete cascade,
  volunteer_id uuid not null references volunteer(id) on delete cascade,
  status text not null default 'applied' check (status in ('applied','accepted','completed','withdrawn')),
  via text check (via is null or via ~ '^[a-z0-9-]{1,32}$'),
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, volunteer_id)
);
create index if not exists opportunity_application_volunteer on opportunity_application (volunteer_id);

create table if not exists usage_day (
  day date not null,
  kind text not null check (kind in ('view','outbound')),
  key text not null check (length(key) between 1 and 120),
  hits integer not null default 0 check (hits >= 0),
  primary key (day, kind, key)
);

-- One random salt per day (Pacific). Salts older than yesterday are deleted,
-- after which no one, the team included, can tell whether two days' visitors
-- were the same person.
create table if not exists usage_salt (
  day date primary key,
  salt text not null
);

create table if not exists usage_visitor (
  day date not null,
  visitor text not null check (visitor ~ '^[0-9a-f]{32}$'),
  first_path text not null,
  via text check (via is null or via ~ '^[a-z0-9-]{1,32}$'),
  views integer not null default 1 check (views >= 1),
  primary key (day, visitor)
);

commit;
