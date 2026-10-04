-- Checks for gathering push alerts. Runs after policies.sql on the same scratch database.

\set ON_ERROR_STOP on

reset role;
truncate auth.users cascade;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),  -- host
  ('00000000-0000-0000-0000-0000000000b1'),  -- nearby, opted in
  ('00000000-0000-0000-0000-0000000000c1'),  -- nearby, opted out
  ('00000000-0000-0000-0000-0000000000d1'),  -- far away, opted in
  ('00000000-0000-0000-0000-0000000000e1');  -- nearby, opted in, blocked the host

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

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, display_name, gathering_alerts, alert_lat, alert_lng, radius_km)
values (auth.uid(), 'Ben', true, 40.745678, -74.049876, 3);
select public.register_push_device(repeat('b', 64), 'sandbox');
select pg_temp.expect(
  (select alert_lat = 40.75 and alert_lng = -74.05 from public.profiles),
  'alert location is rounded to about 1 km'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (id, display_name, gathering_alerts, alert_lat, alert_lng)
values (auth.uid(), 'Chen', false, 40.745, -74.049);
select public.register_push_device(repeat('c', 64), 'sandbox');
select pg_temp.expect(
  (select alert_lat is null and alert_lng is null from public.profiles),
  'alert location is discarded when alerts are off'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
insert into public.profiles (id, display_name, gathering_alerts, alert_lat, alert_lng, radius_km)
values (auth.uid(), 'Dana', true, 34.05, -118.24, 10);
select public.register_push_device(repeat('d', 64), 'production');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
insert into public.profiles (id, display_name, gathering_alerts, alert_lat, alert_lng, radius_km)
values (auth.uid(), 'Eli', true, 40.746, -74.050, 3);
select public.register_push_device(repeat('e', 64), 'sandbox');
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-0000000000a1');

select pg_temp.expect((select count(*) = 1 from public.push_devices), 'people only see their own devices');

do $$ begin
  perform public.claim_new_gathering_alerts(gen_random_uuid(), auth.uid());
  raise exception 'FAILED: a regular user could call claim_new_gathering_alerts';
exception when insufficient_privilege then raise notice 'ok - only the server can claim alerts';
end $$;

-- Host posts two gatherings.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.gatherings (id, title, starts_at, place_name, lat, lng) values
  ('10000000-0000-0000-0000-000000000001', 'Sunset walk', now() + interval '1 day', 'Hamilton Park', 40.7456, -74.0498),
  ('10000000-0000-0000-0000-000000000002', 'Tea and books', now() + interval '2 days', 'Library', 40.7450, -74.0490);

set role service_role;

select pg_temp.expect(
  (select count(*) = 0 from public.claim_new_gathering_alerts('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')),
  'only the host can trigger alerts for their gathering'
);

create temp table first_alert as
  select * from public.claim_new_gathering_alerts('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect(
  (select count(*) = 1 and bool_and(token = repeat('b', 64)) from first_alert),
  'only nearby, opted-in, unblocked people are alerted (and not the host)'
);
select pg_temp.expect(
  (select count(*) = 0 from public.claim_new_gathering_alerts('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')),
  'a gathering only triggers alerts once'
);
select pg_temp.expect(
  (select count(*) = 0 from public.claim_new_gathering_alerts('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1')),
  'people get at most one gathering alert a day'
);

-- Joining alerts the host once.
reset role;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.gathering_rsvps (gathering_id) values ('10000000-0000-0000-0000-000000000001');

set role service_role;
select pg_temp.expect(
  (select count(*) = 1 and bool_and(token = repeat('a', 64) and joiner_name = 'Ben' and gathering_title = 'Sunset walk')
   from public.claim_join_alert('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')),
  'the host is told who joined'
);
select pg_temp.expect(
  (select count(*) = 0 from public.claim_join_alert('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')),
  'leaving and rejoining does not alert the host again'
);
select pg_temp.expect(
  (select count(*) = 0 from public.claim_join_alert('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1')),
  'people who did not join cannot trigger a join alert'
);

-- Moving a device to another account.
reset role;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select public.register_push_device(repeat('b', 64), 'sandbox');
reset role;
select pg_temp.expect(
  (select user_id = '00000000-0000-0000-0000-0000000000c1' from public.push_devices where token = repeat('b', 64)),
  'a device signed into a new account moves to that account'
);

\echo 'All alert checks passed'
