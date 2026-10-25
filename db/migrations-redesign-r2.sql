-- Round 2 (VOL): schema change + a second and third organization in Ana Reyes's
-- folders. Idempotent: safe to run more than once. Riverside is not touched.
begin;

-- 1. Walk-in / join consent: 13 to 17 also confirm a guardian knows.
alter table volunteer add column if not exists guardian_ack_at timestamptz;
update volunteer set guardian_ack_at = coalesce(terms_accepted_at, created_at)
where guardian_ack_at is null and date_of_birth > (current_date - interval '18 years') and date_of_birth <= (current_date - interval '13 years');

-- 2. Six made-up regulars at Eastside and Northside (adults).
insert into volunteer (name, email, date_of_birth, created_at, terms_accepted_at) values
  ('Rhea Castillo',  'rhea.castillo@example.test',  '2003-08-14', '2026-09-01 18:00-07', '2026-09-01 18:00-07'),
  ('Malik Johnson',  'malik.johnson@example.test',  '2001-11-02', '2026-09-01 18:05-07', '2026-09-01 18:05-07'),
  ('Bea Lindqvist',  'bea.lindqvist@example.test',  '2004-02-19', '2026-09-02 09:10-07', '2026-09-02 09:10-07'),
  ('Tomas Ferreira', 'tomas.ferreira@example.test', '2002-06-30', '2026-09-03 12:00-07', '2026-09-03 12:00-07'),
  ('Ines Duarte',    'ines.duarte@example.test',    '2005-01-09', '2026-09-04 16:30-07', '2026-09-04 16:30-07'),
  ('Kofi Mensah',    'kofi.mensah@example.test',    '2000-09-21', '2026-09-05 08:45-07', '2026-09-05 08:45-07')
on conflict (email) do nothing;

-- 3. Three past, verified events.
insert into event (org_id, title, location, starts_at, ends_at, checkin_code, status, closed_at, activity, goal_outcome, cohort_rating, attested_at, goal_text, outcome_text)
select o.id, x.title, x.location, x.starts::timestamptz, x.ends::timestamptz, x.code, 'closed', x.attested::timestamptz, x.activity, 'yes', x.rating, x.attested::timestamptz, x.goal, x.outcome
from (values
  ('Eastside Learning Circle',   'Saturday Reading Buddies', 'Eastside Branch Library, San José', '2026-09-12 10:00-07', '2026-09-12 12:00-07', '2026-09-13 09:15-07', 'ELRB12', 'education', 5, 'Read one-on-one with 12 second graders', 'Read with 14 kids; 9 finished a chapter book'),
  ('Northside Neighbors Pantry', 'Fall Food Drive Sort',     'Northside Neighbors Pantry, San José', '2026-09-26 09:00-07', '2026-09-26 12:30-07', '2026-09-27 11:00-07', 'NNFD26', 'logistics', 4, 'Sort the fall food drive into family boxes', 'Sorted 900 lbs into 96 family boxes'),
  ('Eastside Learning Circle',   'Homework Help Night',      'Eastside Branch Library, San José', '2026-10-07 16:00-07', '2026-10-07 18:00-07', '2026-10-08 10:00-07', 'ELHW07', 'education', 5, 'Help 15 students finish the week''s homework', 'Helped 17 students; math and reading')
) as x(org, title, location, starts, ends, attested, code, activity, rating, goal, outcome)
join org o on o.name = x.org
on conflict (checkin_code) do nothing;

-- 4. Who came (all checked out; attested with the event).
insert into attendance (event_id, volunteer_id, display_name, method, checked_in_at, checked_out_at, hours_captured, role, status, attested_at)
select e.id, v.id, v.name, 'qr', e.starts_at + make_interval(mins => c.late), e.starts_at + make_interval(mins => c.late) + (e.ends_at - e.starts_at),
       round(extract(epoch from (e.ends_at - e.starts_at)) / 3600.0, 2), c.role, 'attested', e.attested_at
from (values
  ('ELRB12', 'ana@example.test', 0, 'general'), ('ELRB12', 'rhea.castillo@example.test', 2, 'team_lead'), ('ELRB12', 'bea.lindqvist@example.test', 1, 'general'),
  ('ELRB12', 'ines.duarte@example.test', 4, 'general'), ('ELRB12', 'kofi.mensah@example.test', 3, 'general'),
  ('NNFD26', 'ana@example.test', 1, 'team_lead'), ('NNFD26', 'malik.johnson@example.test', 0, 'event_coordinator'), ('NNFD26', 'tomas.ferreira@example.test', 2, 'general'),
  ('NNFD26', 'kofi.mensah@example.test', 5, 'general'), ('NNFD26', 'bea.lindqvist@example.test', 3, 'general'),
  ('ELHW07', 'ana@example.test', 2, 'general'), ('ELHW07', 'rhea.castillo@example.test', 0, 'team_lead'), ('ELHW07', 'malik.johnson@example.test', 4, 'general'),
  ('ELHW07', 'ines.duarte@example.test', 1, 'general')
) as c(code, email, late, role)
join event e on e.checkin_code = c.code
join volunteer v on v.email = c.email
on conflict (event_id, volunteer_id) do nothing;

-- 5. Their records.
insert into record (attendance_id, volunteer_id, org_id, issued_at)
select a.id, a.volunteer_id, e.org_id, e.attested_at
from attendance a join event e on e.id = a.event_id
where e.checkin_code in ('ELRB12', 'NNFD26', 'ELHW07')
on conflict (attendance_id) do nothing;

commit;
