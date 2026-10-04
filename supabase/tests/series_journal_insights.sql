-- Checks for two-way blocking, weekly gatherings, journal logging and usage views.

\set ON_ERROR_STOP on

reset role;
truncate auth.users cascade;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),  -- host
  ('00000000-0000-0000-0000-0000000000b1'),  -- attendee
  ('00000000-0000-0000-0000-0000000000c1');  -- someone the host blocked

create or replace function pg_temp.act_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false);
$$;

create or replace function pg_temp.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

create or replace function pg_temp.expect_error(statement text, fragment text, label text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'FAILED: %', label;
exception when others then
  if sqlerrm like 'FAILED:%' or position(fragment in sqlerrm) = 0 then
    raise exception 'FAILED: % (got "%")', label, sqlerrm;
  end if;
  raise notice 'ok - %', label;
end $$;

set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Asha');
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-0000000000c1');

-- A weekly series of 4 dates counts once toward the limits.
insert into public.gatherings (title, starts_at, place_name, lat, lng, series_id)
select 'Tuesday walk', now() + interval '1 day' + make_interval(days => 7 * n), 'Park', 40.7456, -74.0498,
       '50000000-0000-0000-0000-000000000001'
from generate_series(0, 3) n;
select pg_temp.expect(
  (select count(*) = 4 from public.gatherings where series_id = '50000000-0000-0000-0000-000000000001'),
  'a weekly gathering creates every date at once'
);
select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng, series_id)
    values ('Fifth week', now() + interval '29 days', 'Park', 40.7, -74.0, '50000000-0000-0000-0000-000000000001')$$,
  'up to 4 weeks',
  'a series has at most 4 dates'
);
insert into public.gatherings (title, starts_at, place_name, lat, lng) values
  ('Coffee', now() + interval '2 days', 'Cafe', 40.7456, -74.0498),
  ('Books', now() + interval '3 days', 'Library', 40.7456, -74.0498);
select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng)
    values ('Fourth today', now() + interval '4 days', 'Park', 40.7, -74.0)$$,
  'up to 3 gatherings a day',
  'the series counted as one of the 3 gatherings a day'
);

update public.gatherings set series_id = gen_random_uuid() where title = 'Coffee';
select pg_temp.expect(
  (select series_id is null from public.gatherings where title = 'Coffee'),
  'series_id cannot be changed later'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Ben');
select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng, series_id)
    values ('Sneaky', now() + interval '2 days', 'Park', 40.7, -74.0, '50000000-0000-0000-0000-000000000001')$$,
  'created together',
  'people cannot add dates to someone else''s series'
);
select pg_temp.expect(
  (select count(*) = 4 from public.nearby_gatherings(40.7456, -74.0498, 3) where series_id is not null),
  'nearby gatherings include the series'
);

-- Two-way blocking.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Chen');
select pg_temp.expect(
  (select count(*) = 0 from public.nearby_gatherings(40.7456, -74.0498, 3)),
  'people a host blocked cannot see the host''s gatherings'
);
select pg_temp.expect(
  (select count(*) = 0 from public.gatherings),
  'people a host blocked cannot read them directly either'
);

-- Logging a gathering in the journal.
reset role;
update public.gatherings set created_at = now() - interval '2 days';
insert into public.gatherings (id, host_id, title, starts_at, duration_minutes, place_name, lat, lng)
values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Last night', now() + interval '1 hour', 60, 'Park', 40.7, -74.0);
insert into public.gathering_rsvps (gathering_id, user_id)
values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1');
update public.gatherings set starts_at = now() - interval '1 day' where id = '60000000-0000-0000-0000-000000000001';

set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect(
  (select count(*) = 1 and bool_and(title = 'Last night') from public.gatherings_to_log()),
  'gatherings you went to show up to log once they end'
);
insert into public.activity_logs (activity_id, title, kind, duration_minutes)
values ('gathering-60000000-0000-0000-0000-000000000001', 'Last night', 'community', 60);
select pg_temp.expect(
  (select count(*) = 0 from public.gatherings_to_log()),
  'logged gatherings stop showing up'
);

-- Usage views.
select pg_temp.expect_error($$select * from insights.totals$$, 'permission denied', 'the app cannot read usage numbers');
reset role;
select pg_temp.expect(
  (select people = 3 and activities_done = 1 from insights.totals),
  'totals add up'
);
select pg_temp.expect(
  (select signups = 3 and activities_done = 1 and rsvps >= 1 from insights.daily where day = current_date),
  'daily numbers add up'
);
select pg_temp.expect((select count(*) >= 1 from insights.retention), 'retention has a row per signup week');
select pg_temp.expect(
  (select times_done = 1 from insights.top_activities where activity_id like 'gathering-%'),
  'top activities counts what people did'
);

\echo 'All series, journal and insights checks passed'
