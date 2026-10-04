-- Checks for meeting spots, attendee lists and cancellation alerts. Runs after moderation.sql.

\set ON_ERROR_STOP on

reset role;
truncate auth.users cascade;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),  -- host
  ('00000000-0000-0000-0000-0000000000b1'),  -- attendee
  ('00000000-0000-0000-0000-0000000000c1');  -- nearby, not going

create or replace function pg_temp.act_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false);
$$;

create or replace function pg_temp.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

set role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Asha');
select public.register_push_device(repeat('a', 64), 'sandbox');
insert into public.gatherings (id, title, starts_at, place_name, lat, lng, meeting_note) values
  ('40000000-0000-0000-0000-000000000001', 'Sunset walk', now() + interval '1 day', 'Hamilton Park', 40.7456, -74.0498, 'By the fountain, red umbrella');

do $$ begin
  insert into public.gatherings (title, starts_at, place_name, lat, lng, meeting_note)
  values ('Too long', now() + interval '1 day', 'Park', 40.7, -74.0, repeat('x', 141));
  raise exception 'FAILED: accepted a 141 character meeting spot';
exception when check_violation then raise notice 'ok - meeting spots are at most 140 characters';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Ben');
select public.register_push_device(repeat('b', 64), 'production');
insert into public.gathering_rsvps (gathering_id) values ('40000000-0000-0000-0000-000000000001');
select pg_temp.expect(
  (select meeting_note = 'By the fountain, red umbrella' from public.my_upcoming_gatherings()),
  'attendees see the meeting spot'
);
select pg_temp.expect(
  (select count(*) = 0 from public.gathering_attendees('40000000-0000-0000-0000-000000000001')),
  'attendees cannot list who else is going'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Chen');
select public.register_push_device(repeat('c', 64), 'sandbox');
select pg_temp.expect(
  (select meeting_note <> '' from public.nearby_gatherings(40.7456, -74.0498, 3)),
  'nearby gatherings include the meeting spot'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect(
  (select count(*) = 1 and bool_and(display_name = 'Ben')
   from public.gathering_attendees('40000000-0000-0000-0000-000000000001')),
  'hosts see the first names of people going, not themselves'
);

update public.gatherings set meeting_note = 'Moved to the café' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.expect(
  (select meeting_note = 'Moved to the café' from public.gatherings where id = '40000000-0000-0000-0000-000000000001'),
  'hosts can update the meeting spot'
);

-- Cancelling.
set role service_role;
select pg_temp.expect(
  (select count(*) = 0 from public.claim_cancel_alert('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')),
  'no cancellation alert while the gathering is still on'
);

reset role;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
update public.gatherings set cancelled = true where id = '40000000-0000-0000-0000-000000000001';

set role service_role;
select pg_temp.expect(
  (select count(*) = 0 from public.claim_cancel_alert('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')),
  'only the host can trigger a cancellation alert'
);
select pg_temp.expect(
  (select count(*) = 1 and bool_and(token = repeat('b', 64) and gathering_title = 'Sunset walk')
   from public.claim_cancel_alert('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')),
  'everyone going is told it was cancelled, but not the host or bystanders'
);
select pg_temp.expect(
  (select count(*) = 0 from public.claim_cancel_alert('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')),
  'a cancellation alerts people once'
);

reset role;
set role authenticated;
do $$ begin
  perform public.claim_cancel_alert(gen_random_uuid(), auth.uid());
  raise exception 'FAILED: a regular user could call claim_cancel_alert';
exception when insufficient_privilege then raise notice 'ok - only the server can claim cancellation alerts';
end $$;

\echo 'All gathering detail checks passed'
