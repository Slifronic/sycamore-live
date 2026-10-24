-- SycaMore Live schema. Base tables follow build/00-SHARED-CONTRACT.md.
-- Additions for the organization side are marked "org addition" and are
-- additive only: every contract column keeps its name, type and meaning.

create extension if not exists pgcrypto;

drop table if exists badge_award cascade;
drop table if exists record cascade;
drop table if exists attendance cascade;
drop table if exists volunteer cascade;
drop table if exists event cascade;
drop table if exists org cascade;

create table org (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_phone text not null,
  contact_email text not null,
  coordinator_name text not null,
  coordinator_pin text not null unique,
  created_at timestamptz default now(),
  -- org additions
  kind text not null default 'nonprofit' check (kind in ('nonprofit','school')),
  city text,
  course jsonb not null default '{}'::jsonb      -- onboarding lesson flags, e.g. {"first_event": "2026-10-23T..."}
);

create table event (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  checkin_code text not null unique,
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz,
  created_at timestamptz default now(),
  -- org additions
  activity text not null default 'general'
    check (activity in ('general','planting','logistics','outreach','education')),
  is_practice boolean not null default false,       -- the onboarding sandbox event
  goal_outcome text check (goal_outcome in ('yes','partly','no')),   -- post-event check
  cohort_rating smallint check (cohort_rating between 1 and 5),
  attested_at timestamptz
);

create table volunteer (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  date_of_birth date not null,
  created_at timestamptz default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references event(id),
  volunteer_id uuid references volunteer(id),
  display_name text not null,
  method text not null check (method in ('qr','code','coordinator','paper_import')),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  hours_captured numeric(5,2) not null default 0,
  hours_adjusted numeric(5,2),
  adjustment_reason text,
  role text not null default 'general'
    check (role in ('general','team_lead','event_coordinator','program_manager')),  -- org addition: program_manager
  status text not null default 'checked_in'
    check (status in ('checked_in','checked_out','no_show','attested')),
  attested_at timestamptz,
  ai_confidence numeric(3,2),
  unique (event_id, volunteer_id),
  -- org additions
  standout boolean not null default false,
  constraint adjustment_needs_reason check (hours_adjusted is null or length(trim(adjustment_reason)) > 0)
);

create table record (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null unique references attendance(id),
  volunteer_id uuid references volunteer(id),
  org_id uuid not null references org(id),
  code text unique,
  issued_at timestamptz not null default now(),
  shared_at timestamptz,
  status text not null default 'active' check (status in ('active','revoked'))
);

-- org addition: badges the coordinator has signed off
create table badge_award (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  volunteer_id uuid not null references volunteer(id),
  badge text not null,               -- key from src/lib/badges.ts
  evidence_note text,                -- what the coordinator saw, printed on the badge
  signed_by text not null,
  signed_at timestamptz not null default now(),
  unique (org_id, volunteer_id, badge)
);

-- After attestation nothing is edited in place.
create or replace function lock_attested() returns trigger language plpgsql as $$
begin
  if old.status = 'attested' then
    raise exception 'attested attendance is read-only';
  end if;
  return new;
end $$;
create trigger attendance_lock before update on attendance
  for each row execute function lock_attested();

create index on event (org_id, starts_at desc);
create index on attendance (event_id);
create index on attendance (volunteer_id);
