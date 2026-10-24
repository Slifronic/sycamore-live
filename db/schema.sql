-- SycaMore Live schema. Base tables follow build/00-SHARED-CONTRACT.md.
-- Additions for the organization side are marked "org addition" and are
-- additive only: every contract column keeps its name, type and meaning.

create extension if not exists pgcrypto;

drop table if exists event_chat_read cascade;
drop table if exists event_chat cascade;
drop table if exists automation_rule cascade;
drop table if exists message cascade;
drop table if exists broadcast cascade;
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
  site_radius_m integer not null default 200 check (site_radius_m between 50 and 2000),
  -- walk-in sign-up: a per-event link for people who have never signed up.
  -- It works from 2 hours before the start until walkin_until (default: 2 hours
  -- after the end), and never once the event is verified. Rotating the token
  -- kills every printed or photographed copy of the old QR code.
  walkin_token text unique,
  walkin_open boolean not null default true,
  walkin_until timestamptz
);

create table volunteer (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  date_of_birth date not null,
  created_at timestamptz default now(),
  -- org additions: how this person joined. A walk-in signs up at the event
  -- itself, with Google or a three-field form; signup_event_id marks their
  -- first event so the roster can show "new".
  google_sub text unique,
  signup_method text not null default 'join' check (signup_method in ('join','walk_in_email','walk_in_google')),
  signup_event_id uuid references event(id),
  -- volunteer addition: a private personal target ("40 hours this year"). It is
  -- never a claim of hours served; only attested records count toward it.
  hours_goal integer check (hours_goal between 1 and 2000)
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references event(id),
  volunteer_id uuid references volunteer(id),
  display_name text not null,
  method text not null check (method in ('qr','code','coordinator','paper_import','walk_in')),  -- org addition: walk_in
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

-- org addition: messages between the coordinator and volunteers, in the app.
-- No phone numbers are collected and nothing leaves SycaMore: the volunteer
-- reads and replies on their "Messages" screen. A broadcast sends one message
-- to an audience; an automation sends one when its trigger fires, at most once
-- per dedupe_key.
create table broadcast (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  title text not null,               -- the coordinator's name for it, e.g. "Saturday reminder"
  body text not null,                -- the template, before {first_name} etc. are filled in
  audience text not null,            -- 'all' | 'regulars' | 'new' | 'away' | 'event:<uuid>'
  audience_label text not null,
  event_id uuid references event(id),   -- the event it invites people to; "showed up" counts check-ins there
  recipients integer not null,
  sent_by text not null,
  sent_at timestamptz not null default now()
);

create table message (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  volunteer_id uuid not null references volunteer(id),
  direction text not null check (direction in ('out','in')),   -- out: org to volunteer
  body text not null check (length(trim(body)) between 1 and 1000),
  source text not null default 'direct' check (source in ('direct','broadcast','automation')),
  broadcast_id uuid references broadcast(id),
  automation_key text,
  dedupe_key text,                   -- automations: one message per trigger, ever
  sent_by text,                      -- coordinator name on outgoing messages
  created_at timestamptz not null default now(),
  read_at timestamptz,               -- out: the volunteer opened it; in: the coordinator did
  unique (org_id, dedupe_key)
);

create table automation_rule (
  org_id uuid not null references org(id),
  key text not null,                 -- key from src/lib/messages.ts AUTOMATIONS
  enabled boolean not null default false,
  body text not null,
  last_run_at timestamptz,
  primary key (org_id, key)
);

-- org addition: one group chat per event. Members are the coordinator and
-- everyone with an account who checked in (or was added) at that event.
-- Volunteers see each other as first name + last initial; nobody sees an
-- email or phone number.
create table event_chat (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  event_id uuid not null references event(id),
  volunteer_id uuid references volunteer(id),   -- null: posted by the coordinator
  author_name text not null,                    -- snapshot at posting time
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table event_chat_read (
  event_id uuid not null references event(id),
  reader text not null,              -- 'org' or the volunteer's id
  last_read_at timestamptz not null default now(),
  primary key (event_id, reader)
);

create index on message (org_id, volunteer_id, created_at);
create index on message (broadcast_id);
create index on event_chat (event_id, created_at);
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

-- org addition: event intake. Where the event is (a picked place with
-- coordinates and a maps link), notes for volunteers, where the details came
-- from (an imported invite, a pasted flyer...), tags, a public page per event
-- and a calendar feed per org. Volatile defaults give every existing row its
-- own random slug and token.
alter table event
  add column place_name text,                 -- "Guadalupe River Park"
  add column place_address text,              -- full address from the map search
  add column place_lat double precision,      -- the pin; also offered for the leave-the-area check
  add column place_lng double precision,
  add column place_url text,                  -- the maps link the coordinator pasted, if any
  add column volunteer_notes text,            -- what to bring, parking, where to meet
  add column source text not null default 'manual'
    check (source in ('manual','ics','feed','link','text','image','repeat')),
  add column source_uid text,                 -- the calendar UID when imported, to catch double imports
  add column public_slug text not null unique default encode(gen_random_bytes(5), 'hex');

alter table org
  add column calendar_token text not null unique default encode(gen_random_bytes(16), 'hex');

drop table if exists event_tag cascade;
drop table if exists tag cascade;

create table tag (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  name text not null check (length(trim(name)) between 1 and 32),
  color text not null default 'sap' check (color in ('sap','sky','sun','clay','plum','stone')),
  created_at timestamptz not null default now()
);
create unique index tag_org_name on tag (org_id, lower(name));

create table event_tag (
  event_id uuid not null references event(id) on delete cascade,
  tag_id uuid not null references tag(id) on delete cascade,
  primary key (event_id, tag_id)
);
create index on event_tag (tag_id);
create index on event (org_id, source_uid);

-- volunteer addition: a public verification link for a signed badge, made by
-- the volunteer (never for a minor), the same pattern as record.code. The
-- award itself stays the coordinator's: the volunteer can only add the link.
alter table badge_award
  add column code text unique,
  add column shared_at timestamptz;

-- volunteer addition: "Save for later" on Discover. Only the event id is kept;
-- nothing about why it was saved (no resume text, no preferences).
drop table if exists saved_event cascade;
create table saved_event (
  volunteer_id uuid not null references volunteer(id) on delete cascade,
  event_id uuid not null references event(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (volunteer_id, event_id)
);
