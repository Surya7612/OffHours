-- Checks that invite-only gatherings stay hidden until someone has the code.

\set ON_ERROR_STOP on

reset role;
truncate auth.users cascade;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1');

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
insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into public.gatherings (title, starts_at, place_name, lat, lng, is_private, invite_code)
values ('Secret coffee', now() + interval '1 day', 'Cafe', 40.7456, -74.0498, true, 'SECRET');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Ben');
select pg_temp.expect(
  (select count(*) = 0 from public.gatherings where title = 'Secret coffee'),
  'a stranger cannot see an invite-only gathering'
);
select pg_temp.expect(
  (select count(*) = 0 from public.nearby_gatherings(40.7456, -74.0498, 5) where title = 'Secret coffee'),
  'nearby hides invite-only gatherings'
);
select pg_temp.expect(
  (select count(*) = 1 from public.gathering_by_invite('secret') where title = 'Secret coffee'),
  'the invite code finds the gathering'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.profiles (id, display_name) values (auth.uid(), 'Cara');
select pg_temp.expect(
  (select count(*) = 0 from public.gathering_by_invite('SECRET')),
  'a blocked person cannot use the invite code'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.gathering_rsvps (gathering_id)
select id from public.gathering_by_invite('SECRET');
select pg_temp.expect(
  (select count(*) = 1 from public.gatherings where title = 'Secret coffee'),
  'joining reveals the gathering'
);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
update public.gatherings set is_private = false where title = 'Secret coffee';
select pg_temp.expect(
  (select is_private from public.gatherings where title = 'Secret coffee'),
  'a gathering cannot be made public after it is posted'
);

reset role;
select 'All private gathering checks passed' as result;
