-- OffHours schema. Every table has row level security; the app only ever uses the anon key
-- plus the signed-in user's JWT.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles ----------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  interests text[] not null default '{}',
  nudge_hour smallint not null default 18 check (nudge_hour between 0 and 23),
  nudge_minute smallint not null default 0 check (nudge_minute between 0 and 59),
  radius_km smallint not null default 3 check (radius_km between 1 and 25),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Create own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Completed activities (the journal) ---------------------------------------------------------

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id text not null,
  title text not null check (char_length(title) <= 120),
  kind text not null check (char_length(kind) <= 40),
  duration_minutes smallint not null check (duration_minutes between 1 and 600),
  place_name text check (char_length(place_name) <= 120),
  reflection text check (char_length(reflection) <= 1000),
  completed_at timestamptz not null default now()
);

create index activity_logs_user_completed on public.activity_logs (user_id, completed_at desc);

alter table public.activity_logs enable row level security;

create policy "Own activity logs" on public.activity_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Blocks --------------------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "Own blocks" on public.blocks
  for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

-- Gatherings hosted by users -----------------------------------------------------------------

create table public.gatherings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  host_name text not null default '',
  title text not null check (char_length(trim(title)) between 3 and 80),
  details text not null default '' check (char_length(details) <= 500),
  starts_at timestamptz not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 10 and 480),
  place_name text not null check (char_length(place_name) between 1 and 120),
  place_address text not null default '' check (char_length(place_address) <= 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  capacity smallint not null default 8 check (capacity between 2 and 50),
  attendee_count smallint not null default 0,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index gatherings_upcoming on public.gatherings (starts_at) where not cancelled;
create index gatherings_lat on public.gatherings (lat);

alter table public.gatherings enable row level security;

create policy "See gatherings from people you have not blocked" on public.gatherings
  for select to authenticated
  using (
    host_id = (select auth.uid())
    or not exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = gatherings.host_id
    )
  );
create policy "Host a gathering" on public.gatherings
  for insert to authenticated
  with check (host_id = (select auth.uid()) and starts_at > now());
create policy "Hosts edit their gatherings" on public.gatherings
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));
create policy "Hosts delete their gatherings" on public.gatherings
  for delete to authenticated using (host_id = (select auth.uid()));

-- host_name and attendee_count are server-owned. The only path allowed to change
-- attendee_count is the RSVP counting trigger, which runs one trigger level deeper.
create or replace function public.gatherings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select p.display_name into new.host_name from public.profiles p where p.id = new.host_id;
    if new.host_name is null then
      raise exception 'Create your profile before hosting a gathering';
    end if;
    new.attendee_count = 0;
    new.cancelled = false;
  elsif pg_trigger_depth() > 1 then
    return new;
  else
    new.host_id = old.host_id;
    new.host_name = old.host_name;
    new.attendee_count = old.attendee_count;
    if new.capacity < old.attendee_count then
      raise exception 'Capacity cannot be lower than the number of people already going';
    end if;
  end if;
  return new;
end $$;

create trigger gatherings_before_write before insert or update on public.gatherings
  for each row execute function public.gatherings_before_write();

-- RSVPs ---------------------------------------------------------------------------------------

create table public.gathering_rsvps (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gathering_id, user_id)
);

create index gathering_rsvps_user on public.gathering_rsvps (user_id);

alter table public.gathering_rsvps enable row level security;

create policy "See own RSVPs and RSVPs to gatherings you host" on public.gathering_rsvps
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.gatherings g
      where g.id = gathering_rsvps.gathering_id and g.host_id = (select auth.uid())
    )
  );
create policy "RSVP for yourself" on public.gathering_rsvps
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Cancel your own RSVP" on public.gathering_rsvps
  for delete to authenticated using (user_id = (select auth.uid()));

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

create trigger gathering_rsvps_before_insert before insert on public.gathering_rsvps
  for each row execute function public.gathering_rsvps_before_insert();

create or replace function public.gathering_rsvps_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  gid uuid := coalesce(new.gathering_id, old.gathering_id);
begin
  update public.gatherings
  set attendee_count = (select count(*) from public.gathering_rsvps r where r.gathering_id = gid)
  where id = gid;
  return null;
end $$;

create trigger gathering_rsvps_count after insert or delete on public.gathering_rsvps
  for each row execute function public.gathering_rsvps_count();

-- Hosts are always going to their own gathering.
create or replace function public.gatherings_host_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.gathering_rsvps (gathering_id, user_id) values (new.id, new.host_id);
  return null;
end $$;

create trigger gatherings_host_rsvp after insert on public.gatherings
  for each row execute function public.gatherings_host_rsvp();

-- Reports (App Store guideline 1.2 requires a way to report user-generated content) ---------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  gathering_id uuid references public.gatherings (id) on delete set null,
  reported_user_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.reports enable row level security;

create policy "File a report" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Nearby gatherings ---------------------------------------------------------------------------

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
    g.id, g.host_id, g.host_name, g.title, g.details, g.starts_at, g.duration_minutes,
    g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
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
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
    and g.lat between p_lat - p_radius_km / 111.0 and p_lat + p_radius_km / 111.0
    and d.km <= p_radius_km
  order by g.starts_at
  limit 100;
$$;

grant execute on function public.nearby_gatherings(double precision, double precision, double precision) to authenticated;

create or replace function public.my_upcoming_gatherings()
returns table (
  id uuid,
  host_id uuid,
  host_name text,
  title text,
  details text,
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
    g.id, g.host_id, g.host_name, g.title, g.details, g.starts_at, g.duration_minutes,
    g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
    null::double precision, true
  from public.gathering_rsvps r
  join public.gatherings g on g.id = r.gathering_id
  where r.user_id = (select auth.uid())
    and not g.cancelled
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
  order by g.starts_at;
$$;

grant execute on function public.my_upcoming_gatherings() to authenticated;

-- Account deletion (App Store guideline 5.1.1(v)) ---------------------------------------------

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
