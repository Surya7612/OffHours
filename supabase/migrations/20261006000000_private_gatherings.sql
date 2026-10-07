-- Invite-only gatherings. Nearby people cannot see them; a code opens one.
-- Safe to run again if an earlier attempt stopped partway.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gatherings' and column_name = 'series_id'
  ) then
    raise exception 'Run 20261004040000_series_journal_insights.sql first';
  end if;
end $$;

alter table public.gatherings add column if not exists is_private boolean not null default false;
alter table public.gatherings add column if not exists invite_code text;

create unique index if not exists gatherings_invite_code
  on public.gatherings (invite_code) where invite_code is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gatherings_invite_code_format'
  ) then
    alter table public.gatherings add constraint gatherings_invite_code_format
      check (invite_code is null or invite_code ~ '^[A-HJ-NP-Z2-9]{6}$');
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'gatherings_private_has_code'
  ) then
    alter table public.gatherings add constraint gatherings_private_has_code
      check (not is_private or invite_code is not null);
  end if;
end $$;

-- Privacy can't be changed after posting, so a public gathering can't disappear from nearby later.
create or replace function public.gatherings_keep_privacy() returns trigger
language plpgsql as $$
begin
  new.is_private = old.is_private;
  new.invite_code = old.invite_code;
  return new;
end $$;

create or replace trigger gatherings_keep_privacy before update on public.gatherings
  for each row execute function public.gatherings_keep_privacy();

-- A direct policy subquery would recurse: gathering visibility reads RSVPs, and RSVP
-- visibility reads gatherings. This check runs with the owner's rights instead.
create or replace function public.going_to(p_gathering_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gathering_rsvps r
    where r.gathering_id = p_gathering_id and r.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.going_to(uuid) from public, anon;
grant execute on function public.going_to(uuid) to authenticated;

drop policy if exists "See gatherings unless either person blocked the other" on public.gatherings;
create policy "See gatherings unless either person blocked the other" on public.gatherings
  for select to authenticated
  using (
    host_id = (select auth.uid())
    or public.going_to(id)
    or (not is_private and not public.blocked_with_me(host_id))
  );

-- The public list never includes invite-only gatherings, even for their host.
create or replace function public.nearby_gatherings(
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
  is_going boolean
)
language sql stable security invoker set search_path = public as $$
  select
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.series_id, g.starts_at,
    g.duration_minutes, g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
    d.km,
    exists (
      select 1 from public.gathering_rsvps r
      where r.gathering_id = g.id and r.user_id = (select auth.uid())
    )
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

create or replace function public.gathering_by_invite(p_code text)
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
  invite_code text
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
    g.is_private, g.invite_code
  from public.gatherings g
  where g.is_private
    and g.invite_code = upper(trim(p_code))
    and not g.cancelled
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
    and not public.blocked_with_me(g.host_id);
$$;

revoke execute on function public.gathering_by_invite(text) from public, anon;
grant execute on function public.gathering_by_invite(text) to authenticated;
