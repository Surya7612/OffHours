-- RSVP deadlines, waitlists, host updates, confirm, and arrival.

\set ON_ERROR_STOP on

reset role;
truncate auth.users cascade;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d1');

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
insert into public.gatherings (title, starts_at, duration_minutes, place_name, lat, lng, capacity, rsvp_closes_at)
values ('River walk', now() + interval '2 days', 60, 'Park', 40.7456, -74.0498, 2, now() + interval '1 day');
insert into public.gatherings (title, starts_at, place_name, lat, lng, capacity, rsvp_closes_at)
values ('Closed already', now() + interval '2 days', 'Park', 40.74, -74.04, 6, now() - interval '1 minute');
insert into public.gatherings (title, starts_at, duration_minutes, place_name, lat, lng)
values ('Last month', now() + interval '3 days', 60, 'Park', 40.74, -74.04);
update public.gatherings set starts_at = now() - interval '40 days' where title = 'Last month';

reset role;
alter table public.gatherings disable trigger gatherings_limits;
alter table public.gatherings disable trigger gatherings_host_rsvp;
insert into public.gatherings (host_id, title, starts_at, duration_minutes, place_name, lat, lng, is_private, invite_code)
values ('00000000-0000-0000-0000-0000000000a1', 'Old secret', now() - interval '10 days', 60, 'Park', 40.74, -74.04, true, 'SECRET');
alter table public.gatherings enable trigger gatherings_limits;
alter table public.gatherings enable trigger gatherings_host_rsvp;
set role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Ben');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Cara');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Dee');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.gathering_rsvps (gathering_id)
select id from public.gatherings where title = 'River walk';

select pg_temp.expect(
  (select attendee_count = 2 from public.gatherings where title = 'River walk'),
  'the second person fills a gathering of two'
);

do $$
begin
  insert into public.gathering_rsvps (gathering_id)
  select id from public.gatherings where title = 'Closed already';
  raise exception 'RSVP after the deadline should fail';
exception when others then
  if sqlerrm not like '%closed%' then raise; end if;
end $$;
select pg_temp.expect(true, 'an RSVP after the deadline is rejected');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.gathering_waitlist (gathering_id)
select id from public.gatherings where title = 'River walk';

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
insert into public.gathering_announcements (gathering_id, body)
select id, 'Meet by the north gate' from public.gatherings where title = 'River walk';

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect(
  (select count(*) = 0 from public.gathering_announcements),
  'someone waiting cannot read host updates'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect(
  (select count(*) = 1 from public.gathering_announcements),
  'someone going can read the host update'
);
update public.gathering_rsvps set confirmed_at = now()
where gathering_id = (select id from public.gatherings where title = 'River walk');
select pg_temp.expect(
  (select confirmed_at is not null from public.gathering_rsvps
    where user_id = '00000000-0000-0000-0000-0000000000b1'),
  'someone going can confirm'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect(
  (select count(*) = 0 from public.gathering_announcements),
  'a stranger cannot read host updates'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
delete from public.gathering_rsvps
where user_id = auth.uid()
  and gathering_id = (select id from public.gatherings where title = 'River walk');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect(
  (select count(*) = 1 from public.gathering_rsvps r
    join public.gatherings g on g.id = r.gathering_id
    where g.title = 'River walk' and r.user_id = '00000000-0000-0000-0000-0000000000c1'),
  'leaving gives the spot to the person who waited longest'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect(
  (select public.host_completed_count('00000000-0000-0000-0000-0000000000a1') = 1),
  'host history counts finished public gatherings only'
);

reset role;
select 'All gathering company checks passed' as result;
