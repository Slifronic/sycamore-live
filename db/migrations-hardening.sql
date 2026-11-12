-- Hardening, 12 Nov 2026. Idempotent: safe to run again on the live database.
--   psql "$DATABASE_URL" -f db/migrations-hardening.sql
-- Run it as written (autocommit): the indexes are built CONCURRENTLY, which cannot be inside
-- a transaction.

-- 1. The home page's "See a verified record" card shows only a record marked for it. It used
--    to take the oldest shared record in the database, which on a real deployment is the first
--    real volunteer to share one.
alter table record add column if not exists featured boolean not null default false;
update record set featured = true where code = 'SYC-RVR7-PLNT' and not featured;

-- 2. Nobody can be added to an event that is already verified. The check was in application
--    code a statement before the insert; a check-in or walk-in landing while the coordinator
--    verified was written to a closed event, where it can never be verified and the volunteer
--    sees nothing. FOR SHARE waits for a verification in flight, then reads its result.
create or replace function refuse_checkin_into_verified_event() returns trigger language plpgsql as $$
declare v timestamptz;
begin
  if new.status in ('checked_in', 'checked_out') then
    select attested_at into v from event where id = new.event_id for share;
    if v is not null then
      raise exception 'event is verified; attendance cannot be added' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists attendance_no_insert_after_attest on attendance;
create trigger attendance_no_insert_after_attest before insert on attendance
  for each row execute function refuse_checkin_into_verified_event();

-- 3. Indexes for foreign keys and for the queries that had none to use.
create index concurrently if not exists record_volunteer_id_idx   on record (volunteer_id) where volunteer_id is not null;
create index concurrently if not exists record_org_id_idx         on record (org_id);
create index concurrently if not exists message_volunteer_idx     on message (volunteer_id, org_id, created_at);
create index concurrently if not exists message_org_thread_idx    on message (org_id, volunteer_id, created_at desc);
create index concurrently if not exists message_org_unread_idx    on message (org_id) where direction = 'in' and read_at is null;
create index concurrently if not exists badge_award_volunteer_idx on badge_award (volunteer_id);
create index concurrently if not exists event_chat_org_unread_idx on event_chat (org_id, event_id, created_at) where volunteer_id is not null;
create index concurrently if not exists event_chat_volunteer_idx  on event_chat (volunteer_id) where volunteer_id is not null;
create index concurrently if not exists saved_event_event_idx     on saved_event (event_id);
create index concurrently if not exists event_discover_idx        on event (starts_at) where not is_practice and attested_at is null and status = 'open';
create index concurrently if not exists broadcast_org_sent_idx    on broadcast (org_id, sent_at desc);
create index concurrently if not exists broadcast_event_idx       on broadcast (event_id) where event_id is not null;
create index concurrently if not exists rate_limit_window_idx     on rate_limit (window_start);
create index concurrently if not exists email_code_expires_idx    on email_code (expires_at);
create index concurrently if not exists auth_pending_expires_idx  on auth_pending (expires_at);
