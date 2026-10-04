-- Behavior checks for the RLS policies and triggers. Run against a scratch database that has
-- Supabase's auth stub (see supabase/tests/run.sh); every check raises on failure.

\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');

create or replace function pg_temp.act_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false);
$$;

create or replace function pg_temp.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

set role authenticated;

-- A sets up a profile and hosts a gathering for 2 people.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, display_name, interests) values (auth.uid(), 'Asha', '{Walking}');
insert into public.gatherings (title, starts_at, place_name, lat, lng, capacity, host_name, attendee_count)
values ('Sunset walk', now() + interval '1 day', 'Hamilton Park', 40.7456, -74.0498, 2, 'Forged', 40);

select pg_temp.expect(
  (select host_name = 'Asha' and attendee_count = 1 from public.gatherings),
  'host_name comes from the profile, the host is auto-RSVPed, and forged counts are ignored'
);

do $$ begin
  insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-00000000000b', 'Spoof');
  raise exception 'FAILED: created a profile for someone else';
exception when insufficient_privilege then raise notice 'ok - cannot create a profile for another user';
end $$;

-- B joins; C finds it full.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, display_name) values (auth.uid(), 'Ben');
select pg_temp.expect((select count(*) = 0 from public.profiles where display_name = 'Asha'), 'profiles of other people are private');

insert into public.gathering_rsvps (gathering_id) select id from public.gatherings;
select pg_temp.expect((select attendee_count = 2 from public.gatherings), 'joining updates attendee_count');

select pg_temp.expect(
  (select count(*) = 1 and bool_and(is_going) and bool_and(distance_km < 1)
   from public.nearby_gatherings(40.7450, -74.0490, 3)),
  'nearby_gatherings finds it, with distance and is_going'
);
select pg_temp.expect((select count(*) = 0 from public.nearby_gatherings(34.05, -118.24, 10)), 'nearby_gatherings ignores far-away gatherings');
select pg_temp.expect((select count(*) = 1 from public.my_upcoming_gatherings()), 'my_upcoming_gatherings lists joined gatherings');

update public.gatherings set title = 'Hijacked', attendee_count = 0;
select pg_temp.expect((select title = 'Sunset walk' and attendee_count = 2 from public.gatherings), 'non-hosts cannot edit a gathering');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, display_name) values (auth.uid(), 'Chen');
do $$ begin
  insert into public.gathering_rsvps (gathering_id) select id from public.gatherings;
  raise exception 'FAILED: joined a full gathering';
exception when raise_exception then
  if sqlerrm not like '%full%' then raise; end if;
  raise notice 'ok - full gatherings reject new RSVPs (%)', sqlerrm;
end $$;

-- Reports are write-only for users.
insert into public.reports (gathering_id, reported_user_id, reason)
select id, host_id, 'Feels unsafe' from public.gatherings;
select pg_temp.expect((select count(*) = 0 from public.reports), 'reporters cannot read reports back');

-- Blocking hides the host's gatherings.
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) = 0 from public.nearby_gatherings(40.7450, -74.0490, 3)), 'blocked hosts disappear from nearby');
select pg_temp.expect((select count(*) = 0 from public.gatherings), 'blocked hosts disappear from direct reads');

-- B leaves, host edits, host cannot shrink below attendees.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
delete from public.gathering_rsvps where user_id = auth.uid();
select pg_temp.expect((select attendee_count = 1 from public.gatherings), 'leaving updates attendee_count');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.gatherings set capacity = 6, attendee_count = 99, host_name = 'Mallory';
select pg_temp.expect((select capacity = 6 and attendee_count = 1 and host_name = 'Asha' from public.gatherings), 'hosts edit details but not server-owned fields');

do $$ begin
  insert into public.gatherings (title, starts_at, place_name, lat, lng)
  values ('Yesterday', now() - interval '1 day', 'Park', 40.7, -74.0);
  raise exception 'FAILED: created a gathering in the past';
exception when insufficient_privilege then raise notice 'ok - gatherings must start in the future';
end $$;

-- Journal entries are private.
insert into public.activity_logs (activity_id, title, kind, duration_minutes, reflection)
values ('breathing', 'Ten slow breaths', 'mindful', 10, 'Calmer');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 0 from public.activity_logs), 'journal entries are private');

-- Account deletion removes everything the user owns.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
reset role;
select pg_temp.expect((select count(*) = 0 from auth.users where id = '00000000-0000-0000-0000-00000000000a'), 'delete_my_account removes the auth user');
select pg_temp.expect((select count(*) = 0 from public.gatherings), 'their gatherings are deleted');
select pg_temp.expect((select count(*) = 0 from public.activity_logs), 'their journal is deleted');
select pg_temp.expect((select count(*) = 0 from public.profiles where display_name = 'Asha'), 'their profile is deleted');

set role anon;
do $$ begin
  perform public.delete_my_account();
  raise exception 'FAILED: anon could call delete_my_account';
exception when insufficient_privilege then raise notice 'ok - signed-out clients cannot call delete_my_account';
end $$;
reset role;

\echo 'All policy checks passed'
