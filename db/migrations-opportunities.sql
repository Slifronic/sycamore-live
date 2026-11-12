-- Public opportunities board (Nov 12, 2026). Idempotent: safe to run more than
-- once, and on the live database.
--   psql "$DATABASE_URL" -f db/migrations-opportunities.sql
--   npm run db:seed-opportunities
-- schema.sql holds the same table, so `npm run db:reset` needs nothing extra.
begin;

-- Curated public listings at organizations that mostly do not use SycaMore:
-- real, public volunteer pages, each checked by a person on verified_on.
-- /opportunities shows the 'listed' rows; /opportunities/go/<slug> redirects to
-- url (only ever this stored value) and counts the click. Rows are managed
-- from db/opportunities.json with db/seed-opportunities.mjs; there is no admin
-- screen. No volunteer or organization account is referenced here.
create table if not exists opportunity (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 96),
  org_name text not null check (length(trim(org_name)) > 0),
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  url text not null check (url ~ '^https://[^[:space:]]+$'),            -- the organization's own volunteer page
  org_url text check (org_url is null or org_url ~ '^https://[^[:space:]]+$'),
  city text not null check (length(trim(city)) > 0),
  category text not null check (category in (
    'tree_planting','habitat_restoration','creek_cleanup','distribution','tutoring','logistics',
    'animals','seniors','arts','tech','civic','other')),
  schedule text,
  min_age integer check (min_age between 0 and 99),   -- null: the page states no minimum
  min_age_note text,
  group_friendly boolean,                             -- null: the page does not say
  remote boolean not null default false,
  status text not null default 'listed' check (status in ('listed','hidden')),
  verified_on date not null,                          -- the day someone last confirmed the link works
  source text not null default 'curated',
  outbound_clicks integer not null default 0 check (outbound_clicks >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

commit;
