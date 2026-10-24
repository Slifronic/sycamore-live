-- SycaMore Live schema. Base tables follow build/00-SHARED-CONTRACT.md.
-- Additions for the organization side are marked "org addition" and are
-- additive only: every contract column keeps its name, type and meaning.

create extension if not exists pgcrypto;

drop table if exists campaign cascade;
drop table if exists story_clip cascade;
drop table if exists story_note cascade;
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
  attested_at timestamptz,
  goal_text text,                  -- what the event set out to do, e.g. "Plant 40 trees"
  outcome_text text,               -- what got done, written at verify, e.g. "Planted 46 trees"
  -- leave-the-area check: the site's centre and radius, set by the coordinator on the day
  site_lat double precision,
  site_lng double precision,
  site_radius_m integer not null default 200 check (site_radius_m between 50 and 2000)
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
  -- leave-the-area check (opt-in). No coordinates are stored: only when the
  -- volunteer was first seen outside the radius and how far, as a suggestion
  -- the coordinator confirms at verify. Cleared when the event is verified.
  location_opt_in boolean not null default false,
  last_ping_at timestamptz,
  outside_since timestamptz,
  left_area_at timestamptz,
  left_area_m integer,
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

-- org addition: event story. The coordinator talks through what happened
-- (voice notes) and adds phone videos; Claude packages them into a campaign
-- the coordinator reviews and publishes. Media files live on disk (MEDIA_DIR).
create table story_note (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  event_id uuid not null references event(id),
  transcript text not null,          -- what the coordinator said, as they edited it
  source text not null default 'voice' check (source in ('voice','typed')),
  audio_path text,                   -- file name under MEDIA_DIR, null for typed notes
  audio_mime text,
  duration_s numeric(7,1),
  created_at timestamptz not null default now()
);

create table story_clip (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  event_id uuid not null references event(id),
  video_path text not null,
  video_mime text not null,
  poster_path text,
  original_name text,
  size_bytes bigint not null,
  duration_s numeric(7,1),
  description jsonb,                 -- Claude's read of the frames (lib/story.ts ClipDescription)
  caption text,                      -- coordinator's caption; starts as Claude's suggestion
  consent boolean not null default false,  -- everyone recognizable agreed to be shared
  created_at timestamptz not null default now()
);

create table campaign (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  event_id uuid not null unique references event(id),
  slug text unique,                  -- set on first publish; public page /c/<slug>
  draft jsonb not null,              -- headline, story, posts, storyboard (lib/story.ts CampaignDraft)
  facts jsonb not null,              -- the verified facts the draft was written from
  flags jsonb not null default '[]'::jsonb,   -- numbers not found in the facts or the debrief
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index on story_note (event_id, created_at);
create index on story_clip (event_id, created_at);

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
