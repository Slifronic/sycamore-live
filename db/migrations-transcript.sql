-- Service transcript, hour requests and guardian approval (Oct 28, 2026).
-- Idempotent: safe to run more than once.
--   psql "$DATABASE_URL" -f db/migrations-transcript.sql
-- The seed runs it after schema.sql and migrations-auth.sql.
begin;

-- One public link for everything a volunteer has done, across organizations.
alter table volunteer add column if not exists transcript_code text unique;
alter table volunteer add column if not exists transcript_shared_at timestamptz;

-- 13 to 17: a parent or guardian approves sharing by clicking an emailed link.
-- Sharing a record or the transcript checks guardian_share_ok_at.
alter table volunteer add column if not exists guardian_email text;
alter table volunteer add column if not exists guardian_share_ok_at timestamptz;

create table if not exists guardian_request (
  token_hash text primary key,
  volunteer_id uuid not null references volunteer(id) on delete cascade,
  guardian_email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz,
  approved boolean
);
create index if not exists guardian_request_volunteer on guardian_request (volunteer_id);

-- Hours served somewhere not on SycaMore. The volunteer names a supervisor;
-- the supervisor confirms (or declines) from an emailed link, no account
-- needed. A confirmed request shows on the transcript as "confirmed by email",
-- apart from hours an organization attested from scans.
create table if not exists hour_request (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteer(id) on delete cascade,
  org_name text not null check (length(trim(org_name)) between 2 and 120),
  contact_name text not null check (length(trim(contact_name)) between 2 and 80),
  contact_email text not null,
  served_on date not null,
  hours numeric(4,2) not null check (hours > 0 and hours <= 12),
  description text not null check (length(trim(description)) between 10 and 500),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','confirmed','declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sent_count smallint not null default 1,
  last_sent_at timestamptz not null default now(),
  decided_at timestamptz,
  confirmer_name text,
  confirmer_role text,
  confirmed_hours numeric(4,2) check (confirmed_hours is null or (confirmed_hours > 0 and confirmed_hours <= 12)),
  decline_reason text
);
create index if not exists hour_request_volunteer on hour_request (volunteer_id, served_on desc);

commit;
