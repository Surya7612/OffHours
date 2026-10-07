-- RSVP deadlines, waitlists, host updates, and "I'll be there" / "I'm here".
-- Safe to run again. Run 20261006000000_private_gatherings.sql first.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gatherings' and column_name = 'invite_code'
  ) then
    raise exception 'Run 20261006000000_private_gatherings.sql first';
  end if;
end $$;

alter table public.gatherings add column if not exists rsvp_closes_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gatherings_rsvp_closes_before_start'
  ) then
    alter table public.gatherings add constraint gatherings_rsvp_closes_before_start
      check (rsvp_closes_at is null or rsvp_closes_at <= starts_at);
  end if;
end $$;

alter table public.gathering_rsvps add column if not exists confirmed_at timestamptz;
alter table public.gathering_rsvps add column if not exists arrived_at timestamptz;

-- A person can only stamp their own row, and only forward.
create or replace function public.gathering_rsvps_keep_membership() returns trigger
language plpgsql as $$
begin
  new.gathering_id = old.gathering_id;
  new.user_id = old.user_id;
  new.created_at = old.created_at;
  new.confirmed_at = coalesce(old.confirmed_at, new.confirmed_at);
  new.arrived_at = coalesce(old.arrived_at, new.arrived_at);
  return new;
end $$;

create or replace trigger gathering_rsvps_keep_membership before update on public.gathering_rsvps
  for each row execute function public.gathering_rsvps_keep_membership();

drop policy if exists "Update your own RSVP" on public.gathering_rsvps;
create policy "Update your own RSVP" on public.gathering_rsvps
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.gathering_rsvps_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  g public.gatherings%rowtype;
begin
  select * into g from public.gatherings where id = new.gathering_id for update;
  if not found or g.cancelled then
    raise exception 'This gathering is no longer happening';
  end if;
  if g.starts_at + make_interval(mins => g.duration_minutes) < now() then
    raise exception 'This gathering has already ended';
  end if;
  if g.rsvp_closes_at is not null and now() > g.rsvp_closes_at and new.user_id <> g.host_id then
    raise exception 'RSVPs for this gathering are closed';
  end if;
  if g.attendee_count >= g.capacity then
    raise exception 'This gathering is full';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = g.host_id and b.blocked_id = new.user_id)
       or (b.blocker_id = new.user_id and b.blocked_id = g.host_id)
  ) then
    raise exception 'You cannot join this gathering';
  end if;
  return new;
end $$;

-- Waitlist ------------------------------------------------------------------------------------

create table if not exists public.gathering_waitlist (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gathering_id, user_id)
);

alter table public.gathering_waitlist enable row level security;

drop policy if exists "See your waitlist spot" on public.gathering_waitlist;
create policy "See your waitlist spot" on public.gathering_waitlist
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.gatherings g
      where g.id = gathering_waitlist.gathering_id and g.host_id = (select auth.uid())
    )
  );

drop policy if exists "Join a waitlist" on public.gathering_waitlist;
create policy "Join a waitlist" on public.gathering_waitlist
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Leave a waitlist" on public.gathering_waitlist;
create policy "Leave a waitlist" on public.gathering_waitlist
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.gathering_waitlist_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  g public.gatherings%rowtype;
begin
  select * into g from public.gatherings where id = new.gathering_id;
  if not found or g.cancelled then
    raise exception 'This gathering is no longer happening';
  end if;
  if g.starts_at + make_interval(mins => g.duration_minutes) < now() then
    raise exception 'This gathering has already ended';
  end if;
  if g.rsvp_closes_at is not null and now() > g.rsvp_closes_at then
    raise exception 'RSVPs for this gathering are closed';
  end if;
  if g.host_id = new.user_id or exists (
    select 1 from public.gathering_rsvps r
    where r.gathering_id = new.gathering_id and r.user_id = new.user_id
  ) then
    raise exception 'You are already going';
  end if;
  if g.attendee_count < g.capacity then
    raise exception 'There is still a spot. Join instead of waiting.';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = g.host_id and b.blocked_id = new.user_id)
       or (b.blocker_id = new.user_id and b.blocked_id = g.host_id)
  ) then
    raise exception 'You cannot join this gathering';
  end if;
  return new;
end $$;

create or replace trigger gathering_waitlist_before_insert before insert on public.gathering_waitlist
  for each row execute function public.gathering_waitlist_before_insert();

-- When a spot opens, the person who has been waiting longest takes it.
create or replace function public.gathering_rsvps_promote() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  g public.gatherings%rowtype;
  waiter uuid;
begin
  select * into g from public.gatherings where id = old.gathering_id;
  if not found or g.cancelled or g.attendee_count >= g.capacity then
    return null;
  end if;
  for waiter in
    select w.user_id from public.gathering_waitlist w
    where w.gathering_id = old.gathering_id
    order by w.created_at
  loop
    begin
      insert into public.gathering_rsvps (gathering_id, user_id) values (old.gathering_id, waiter);
      delete from public.gathering_waitlist w
      where w.gathering_id = old.gathering_id and w.user_id = waiter;
      exit;
    exception when others then
      raise notice 'waitlist promotion skipped: %', sqlerrm;
    end;
  end loop;
  return null;
end $$;

drop trigger if exists gathering_rsvps_promote on public.gathering_rsvps;
create or replace trigger z_gathering_rsvps_promote after delete on public.gathering_rsvps
  for each row execute function public.gathering_rsvps_promote();

-- Host updates --------------------------------------------------------------------------------

create table if not exists public.gathering_announcements (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists gathering_announcements_gathering
  on public.gathering_announcements (gathering_id, created_at);

alter table public.gathering_announcements enable row level security;

drop policy if exists "Read updates for gatherings you host or joined" on public.gathering_announcements;
create policy "Read updates for gatherings you host or joined" on public.gathering_announcements
  for select to authenticated
  using (
    exists (
      select 1 from public.gatherings g
      where g.id = gathering_announcements.gathering_id and g.host_id = (select auth.uid())
    )
    or public.going_to(gathering_id)
  );

drop policy if exists "Host posts an update" on public.gathering_announcements;
create policy "Host posts an update" on public.gathering_announcements
  for insert to authenticated
  with check (
    exists (
      select 1 from public.gatherings g
      where g.id = gathering_announcements.gathering_id and g.host_id = (select auth.uid())
    )
  );

create or replace function public.gathering_announcements_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  g public.gatherings%rowtype;
begin
  select * into g from public.gatherings where id = new.gathering_id;
  if not found or g.host_id <> (select auth.uid()) then
    raise exception 'Only the host can post an update';
  end if;
  if g.cancelled or g.starts_at + make_interval(mins => g.duration_minutes) < now() then
    raise exception 'This gathering is no longer happening';
  end if;
  return new;
end $$;

create or replace trigger gathering_announcements_before_insert before insert on public.gathering_announcements
  for each row execute function public.gathering_announcements_before_insert();

-- Completed public gatherings this person has hosted. Private ones stay out of the count.
create or replace function public.host_completed_count(p_host_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer
  from public.gatherings g
  where g.host_id = p_host_id
    and not g.cancelled
    and not g.is_private
    and g.starts_at + make_interval(mins => g.duration_minutes) < now();
$$;

revoke execute on function public.host_completed_count(uuid) from public, anon;
grant execute on function public.host_completed_count(uuid) to authenticated;

-- List functions pick up the deadline and this person's confirm / arrive / waitlist state.
drop function if exists public.nearby_gatherings(double precision, double precision, double precision);
drop function if exists public.my_upcoming_gatherings();
drop function if exists public.gathering_by_invite(text);
drop function if exists public.gathering_attendees(uuid);

create function public.nearby_gatherings(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision
)
returns table (
  id uuid,
  host_id uuid,
  host_name text,
  title text,
  details text,
  meeting_note text,
  series_id uuid,
  starts_at timestamptz,
  duration_minutes smallint,
  place_name text,
  place_address text,
  lat double precision,
  lng double precision,
  capacity smallint,
  attendee_count smallint,
  distance_km double precision,
  is_going boolean,
  rsvp_closes_at timestamptz,
  is_waiting boolean,
  confirmed_at timestamptz,
  arrived_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  select
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.series_id, g.starts_at,
    g.duration_minutes, g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
    d.km,
    exists (
      select 1 from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid())
    ),
    g.rsvp_closes_at,
    exists (
      select 1 from public.gathering_waitlist w
      where w.gathering_id = g.id and w.user_id = (select auth.uid())
    ),
    (select r.confirmed_at from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid())),
    (select r.arrived_at from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid()))
  from public.gatherings g
  cross join lateral (
    select 6371 * 2 * asin(sqrt(
      power(sin(radians(g.lat - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(g.lat)) * power(sin(radians(g.lng - p_lng) / 2), 2)
    )) as km
  ) d
  where not g.cancelled
    and not g.is_private
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
    and g.lat between p_lat - p_radius_km / 111.0 and p_lat + p_radius_km / 111.0
    and d.km <= p_radius_km
  order by g.starts_at
  limit 100;
$$;

create function public.my_upcoming_gatherings()
returns table (
  id uuid,
  host_id uuid,
  host_name text,
  title text,
  details text,
  meeting_note text,
  series_id uuid,
  starts_at timestamptz,
  duration_minutes smallint,
  place_name text,
  place_address text,
  lat double precision,
  lng double precision,
  capacity smallint,
  attendee_count smallint,
  distance_km double precision,
  is_going boolean,
  rsvp_closes_at timestamptz,
  is_waiting boolean,
  confirmed_at timestamptz,
  arrived_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  select
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.series_id, g.starts_at,
    g.duration_minutes, g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
    null::double precision, true, g.rsvp_closes_at, false,
    r.confirmed_at, r.arrived_at
  from public.gathering_rsvps r
  join public.gatherings g on g.id = r.gathering_id
  where r.user_id = (select auth.uid())
    and not g.cancelled
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
  order by g.starts_at;
$$;

create function public.gathering_by_invite(p_code text)
returns table (
  id uuid,
  host_id uuid,
  host_name text,
  title text,
  details text,
  meeting_note text,
  series_id uuid,
  starts_at timestamptz,
  duration_minutes smallint,
  place_name text,
  place_address text,
  lat double precision,
  lng double precision,
  capacity smallint,
  attendee_count smallint,
  distance_km double precision,
  is_going boolean,
  is_private boolean,
  invite_code text,
  rsvp_closes_at timestamptz,
  is_waiting boolean,
  confirmed_at timestamptz,
  arrived_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.series_id, g.starts_at,
    g.duration_minutes, g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
    null::double precision,
    exists (
      select 1 from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid())
    ),
    g.is_private, g.invite_code, g.rsvp_closes_at,
    exists (
      select 1 from public.gathering_waitlist w
      where w.gathering_id = g.id and w.user_id = (select auth.uid())
    ),
    (select r.confirmed_at from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid())),
    (select r.arrived_at from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid()))
  from public.gatherings g
  where g.is_private
    and g.invite_code = upper(trim(p_code))
    and not g.cancelled
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
    and not public.blocked_with_me(g.host_id);
$$;

create function public.gathering_attendees(p_gathering_id uuid)
returns table (
  user_id uuid,
  display_name text,
  joined_at timestamptz,
  confirmed_at timestamptz,
  arrived_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.user_id, coalesce(p.display_name, 'Someone'), r.created_at, r.confirmed_at, r.arrived_at
  from public.gatherings g
  join public.gathering_rsvps r on r.gathering_id = g.id
  left join public.profiles p on p.id = r.user_id
  where g.id = p_gathering_id
    and g.host_id = (select auth.uid())
    and r.user_id <> g.host_id
  order by r.created_at;
$$;

revoke execute on function public.nearby_gatherings(double precision, double precision, double precision) from public, anon;
revoke execute on function public.my_upcoming_gatherings() from public, anon;
revoke execute on function public.gathering_by_invite(text) from public, anon;
revoke execute on function public.gathering_attendees(uuid) from public, anon;
grant execute on function public.nearby_gatherings(double precision, double precision, double precision) to authenticated;
grant execute on function public.my_upcoming_gatherings() to authenticated;
grant execute on function public.gathering_by_invite(text) to authenticated;
grant execute on function public.gathering_attendees(uuid) to authenticated;
