-- Checks for hosting limits, report alerts and moderator tools. Runs after alerts.sql.

\set ON_ERROR_STOP on

reset role;
truncate auth.users cascade;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),  -- host
  ('00000000-0000-0000-0000-0000000000b1'),  -- attendee who reports
  ('00000000-0000-0000-0000-0000000000f1');  -- moderator

insert into moderation.moderators (user_id) values ('00000000-0000-0000-0000-0000000000f1');
insert into public.push_devices (token, user_id, environment)
values (repeat('f', 64), '00000000-0000-0000-0000-0000000000f1', 'production');

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

select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng)
    values ('Far off', now() + interval '45 days', 'Park', 40.7, -74.0)$$,
  'up to 30 days ahead',
  'gatherings can only be scheduled 30 days ahead'
);

insert into public.gatherings (id, title, starts_at, place_name, lat, lng) values
  ('20000000-0000-0000-0000-000000000001', 'Walk one', now() + interval '1 day', 'Park', 40.7, -74.0),
  ('20000000-0000-0000-0000-000000000002', 'Walk two', now() + interval '2 days', 'Park', 40.7, -74.0),
  ('20000000-0000-0000-0000-000000000003', 'Walk three', now() + interval '3 days', 'Park', 40.7, -74.0);

select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng)
    values ('Walk four', now() + interval '4 days', 'Park', 40.7, -74.0)$$,
  'up to 3 gatherings a day',
  'hosts can create at most 3 gatherings a day'
);

update public.gatherings set cancelled = true where id = '20000000-0000-0000-0000-000000000003';
select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng)
    values ('Walk four', now() + interval '4 days', 'Park', 40.7, -74.0)$$,
  'up to 3 gatherings a day',
  'cancelling does not free up the daily limit'
);

delete from public.gatherings where id = '20000000-0000-0000-0000-000000000003';
select pg_temp.expect(
  (select count(*) = 3 from public.gatherings where host_id = auth.uid()),
  'hosts cannot delete gatherings to dodge the limit'
);

reset role;
update public.gatherings set created_at = now() - interval '2 days';
insert into public.gatherings (host_id, title, starts_at, place_name, lat, lng, created_at)
select '00000000-0000-0000-0000-0000000000a1', 'Old ' || n, now() + make_interval(days => n), 'Park', 40.7, -74.0, now() - interval '2 days'
from generate_series(4, 6) n;
set role authenticated;
select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng)
    values ('One too many', now() + interval '8 days', 'Park', 40.7, -74.0)$$,
  'up to 5 upcoming gatherings',
  'hosts can have at most 5 upcoming gatherings'
);

-- Reports alert moderators once.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Ben');
insert into public.gathering_rsvps (gathering_id) values ('20000000-0000-0000-0000-000000000001');
insert into public.reports (id, gathering_id, reported_user_id, reason, notified_at, resolved_at)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-0000000000a1', 'Asked for money', now(), now());

set role service_role;
select pg_temp.expect(
  (select count(*) = 0 from public.claim_report_alert('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1')),
  'only the person who filed a report can trigger its alert'
);
select pg_temp.expect(
  (select count(*) = 1 and bool_and(token = repeat('f', 64) and gathering_title = 'Walk one')
   from public.claim_report_alert('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')),
  'moderators get a push for a new report, even if the reporter tried to mark it handled'
);
select pg_temp.expect(
  (select count(*) = 0 from public.claim_report_alert('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')),
  'each report alerts moderators once'
);

reset role;
set role authenticated;
select pg_temp.expect_error(
  $$select * from moderation.open_reports$$,
  'permission denied',
  'the app cannot read the moderation queue'
);
select pg_temp.expect_error(
  $$select moderation.ban_user('00000000-0000-0000-0000-0000000000a1', 'self-serve')$$,
  'permission denied',
  'the app cannot call moderator tools'
);

do $$ begin
  for i in 1..9 loop
    insert into public.reports (reason) values ('Report ' || i);
  end loop;
end $$;
select pg_temp.expect_error(
  $$insert into public.reports (reason) values ('One more')$$,
  'a lot of reports today',
  'people can file at most 10 reports a day'
);

-- Moderator tools, run as the database owner like the SQL editor.
reset role;
select pg_temp.expect(
  (select count(*) = 10 from moderation.open_reports),
  'open reports show up in the moderation queue'
);

select moderation.ban_user('00000000-0000-0000-0000-0000000000a1', 'Scam');
select pg_temp.expect(
  (select count(*) = 0 from public.gatherings where host_id = '00000000-0000-0000-0000-0000000000a1' and not cancelled),
  'banning someone cancels the gatherings they host'
);
select pg_temp.expect(
  (select resolution = 'User banned: Scam' from public.reports where id = '30000000-0000-0000-0000-000000000001'),
  'banning someone resolves reports about them'
);
select pg_temp.expect(
  (select banned_until > now() + interval '50 years' from auth.users where id = '00000000-0000-0000-0000-0000000000a1'),
  'banned people cannot sign in again'
);

set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error(
  $$insert into public.gatherings (title, starts_at, place_name, lat, lng)
    values ('Back again', now() + interval '1 day', 'Park', 40.7, -74.0)$$,
  'can no longer host',
  'banned people cannot host with a session that is still open'
);

reset role;
select moderation.unban_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect(
  (select banned_until is null from auth.users where id = '00000000-0000-0000-0000-0000000000a1')
  and not exists (select 1 from moderation.banned_users),
  'unbanning restores the account'
);

select moderation.resolve_report(report_id, 'Test report') from moderation.open_reports;
select pg_temp.expect(
  (select count(*) = 0 from moderation.open_reports),
  'resolved reports leave the queue'
);

\echo 'All moderation checks passed'
