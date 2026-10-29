-- Production accounts and sign-in (Oct 28, 2026). Idempotent: safe to run more
-- than once, and on a database built from an older schema.sql.
--   psql "$DATABASE_URL" -f db/migrations-auth.sql
-- schema.sql ends with the same tables, so `npm run db:reset` needs nothing extra.
begin;

-- A person who runs volunteers. Signs in with Google (or, for older and demo
-- organizations, the PIN). One account can belong to more than one org.
create table if not exists account (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  google_sub text unique,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create table if not exists org_member (
  org_id uuid not null references org(id) on delete cascade,
  account_id uuid not null references account(id) on delete cascade,
  role text not null default 'coordinator' check (role in ('owner','coordinator')),
  created_at timestamptz not null default now(),
  primary key (org_id, account_id)
);
create index if not exists org_member_account on org_member (account_id);

-- "Add a coordinator": the email signs in with Google and lands in the org.
create table if not exists org_invite (
  org_id uuid not null references org(id) on delete cascade,
  email text not null,
  invited_by uuid references account(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (org_id, email)
);

-- The PIN stays for the demo organization and for orgs set up before Google
-- sign-in. Linking a Google account turns it off.
alter table org add column if not exists pin_enabled boolean not null default true;

-- Set by SycaMore staff after checking the organization is real (its website,
-- EIN or school listing, and that the owner's email belongs to it). Public
-- records say "Verified" only for reviewed organizations; before that they
-- say "Attested by", with the owner's Google-confirmed email domain.
alter table org add column if not exists reviewed_at timestamptz;

-- Set when the volunteer proves they own the email (a Google sign-in or an
-- emailed code). Accounts made at a walk-in table start unverified.
alter table volunteer add column if not exists email_verified_at timestamptz;
update volunteer set email_verified_at = coalesce(email_verified_at, created_at) where google_sub is not null;

-- Server-side sessions. The cookie holds a random token; only its SHA-256 is
-- stored, so a database leak can't be replayed as a sign-in.
create table if not exists auth_session (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  kind text not null check (kind in ('org','vol')),
  org_id uuid references org(id) on delete cascade,
  account_id uuid references account(id) on delete cascade,
  volunteer_id uuid references volunteer(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  check ((kind = 'org' and org_id is not null) or (kind = 'vol' and volunteer_id is not null))
);
create index if not exists auth_session_volunteer on auth_session (volunteer_id);
create index if not exists auth_session_org on auth_session (org_id);
create index if not exists auth_session_expires on auth_session (expires_at);

-- A Google sign-in that still needs a step (a birth date for a volunteer, the
-- organization's details for a coordinator). Short-lived, token hashed.
create table if not exists auth_pending (
  token_hash text primary key,
  kind text not null check (kind in ('org','vol')),
  email text not null,
  name text not null,
  google_sub text not null,
  next text,
  expires_at timestamptz not null
);

-- Emailed 6-digit sign-in codes. Only a hash is kept; 5 tries, 10 minutes.
create table if not exists email_code (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists email_code_email on email_code (email, created_at desc);

-- Fixed-window rate limits for sign-in, codes and AI calls.
create table if not exists rate_limit (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

commit;
