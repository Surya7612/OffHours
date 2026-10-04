-- Two-way blocking, weekly gatherings, logging gatherings in the journal, and usage numbers.

-- Blocking works both ways: neither person sees the other's gatherings ---------------------------

-- People can only read their own blocks, so the check runs with the owner's rights.
create or replace function public.blocked_with_me(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = auth.uid())
  );
$$;

revoke execute on function public.blocked_with_me(uuid) from public, anon;
grant execute on function public.blocked_with_me(uuid) to authenticated;

drop policy "See gatherings from people you have not blocked" on public.gatherings;
create policy "See gatherings unless either person blocked the other" on public.gatherings
  for select to authenticated
  using (host_id = (select auth.uid()) or not public.blocked_with_me(host_id));

-- Weekly gatherings ---------------------------------------------------------------------------
-- A series is up to 4 weekly dates created together. Each date is its own gathering with its own
-- RSVPs; a whole series counts once toward the hosting limits.

alter table public.gatherings add column series_id uuid;
create index gatherings_series on public.gatherings (series_id) where series_id is not null;

create or replace function public.gatherings_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  series_size int;
  series_other_host boolean;
begin
  if exists (select 1 from moderation.banned_users b where b.user_id = new.host_id) then
    raise exception 'Your account can no longer host gatherings';
  end if;
  if new.starts_at > now() + interval '30 days' then
    raise exception 'Gatherings can be scheduled up to 30 days ahead';
  end if;

  if new.series_id is not null then
    select count(*), bool_or(g.host_id <> new.host_id or g.created_at < now() - interval '5 minutes')
    into series_size, series_other_host
    from public.gatherings g where g.series_id = new.series_id;
    if series_other_host then
      raise exception 'Repeating dates have to be created together';
    end if;
    if series_size >= 4 then
      raise exception 'A gathering can repeat for up to 4 weeks';
    end if;
    if series_size > 0 then
      return new;  -- the series was already counted toward the limits
    end if;
  end if;

  if (select count(distinct coalesce(g.series_id, g.id)) from public.gatherings g
      where g.host_id = new.host_id and g.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'You can host up to 3 gatherings a day';
  end if;
  if (select count(distinct coalesce(g.series_id, g.id)) from public.gatherings g
      where g.host_id = new.host_id and not g.cancelled
        and g.starts_at + make_interval(mins => g.duration_minutes) > now()) >= 5 then
    raise exception 'You can have up to 5 upcoming gatherings at a time';
  end if;
  return new;
end $$;

-- series_id can't be changed after creation.
create or replace function public.gatherings_keep_series() returns trigger
language plpgsql as $$
begin
  new.series_id = old.series_id;
  return new;
end $$;

create trigger gatherings_keep_series before update on public.gatherings
  for each row execute function public.gatherings_keep_series();

-- The list functions gain series_id.
drop function public.nearby_gatherings(double precision, double precision, double precision);
drop function public.my_upcoming_gatherings();

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
  is_going boolean
)
language sql stable security invoker set search_path = public as $$
  select
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.series_id, g.starts_at,
    g.duration_minutes, g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
    null::double precision, true
  from public.gathering_rsvps r
  join public.gatherings g on g.id = r.gathering_id
  where r.user_id = (select auth.uid())
    and not g.cancelled
    and g.starts_at + make_interval(mins => g.duration_minutes) > now()
  order by g.starts_at;
$$;

revoke execute on function public.nearby_gatherings(double precision, double precision, double precision) from public, anon;
revoke execute on function public.my_upcoming_gatherings() from public, anon;
grant execute on function public.nearby_gatherings(double precision, double precision, double precision) to authenticated;
grant execute on function public.my_upcoming_gatherings() to authenticated;

-- Gatherings in the journal -------------------------------------------------------------------
-- Gatherings someone went to that ended in the last 3 days and aren't in their journal yet.
-- Journal entries for gatherings use activity_id 'gathering-<id>'.

create or replace function public.gatherings_to_log()
returns table (
  id uuid,
  title text,
  place_name text,
  starts_at timestamptz,
  duration_minutes smallint
)
language sql stable security invoker set search_path = public as $$
  select g.id, g.title, g.place_name, g.starts_at, g.duration_minutes
  from public.gathering_rsvps r
  join public.gatherings g on g.id = r.gathering_id
  where r.user_id = (select auth.uid())
    and not g.cancelled
    and g.starts_at + make_interval(mins => g.duration_minutes) between now() - interval '3 days' and now()
    and not exists (
      select 1 from public.activity_logs l
      where l.user_id = (select auth.uid()) and l.activity_id = 'gathering-' || g.id::text
    )
  order by g.starts_at desc;
$$;

revoke execute on function public.gatherings_to_log() from public, anon;
grant execute on function public.gatherings_to_log() to authenticated;

-- Usage numbers (SQL editor only) -------------------------------------------------------------
-- Built from data the app already stores; nothing new is collected.
--
--   select * from insights.daily limit 14;
--   select * from insights.retention;
--   select * from insights.totals;
--   select * from insights.top_activities;

create schema if not exists insights;
revoke all on schema insights from public;

create view insights.daily as
  with days as (
    select generate_series(
      date_trunc('day', coalesce((select min(created_at) from public.profiles), now())),
      date_trunc('day', now()),
      interval '1 day'
    )::date as day
  ),
  activity as (
    select user_id, completed_at::date as day from public.activity_logs
    union all
    select user_id, created_at::date from public.gathering_rsvps
  )
  select
    d.day,
    (select count(*) from public.profiles p where p.created_at::date = d.day) as signups,
    (select count(distinct a.user_id) from activity a where a.day = d.day) as active_people,
    (select count(*) from public.activity_logs l where l.completed_at::date = d.day) as activities_done,
    (select coalesce(sum(l.duration_minutes), 0) from public.activity_logs l where l.completed_at::date = d.day) as minutes_offline,
    (select count(*) from public.gatherings g where g.created_at::date = d.day) as gatherings_hosted,
    (select count(*) from public.gathering_rsvps r join public.gatherings g on g.id = r.gathering_id
     where r.created_at::date = d.day and r.user_id <> g.host_id) as rsvps
  from days d
  order by d.day desc;

-- Of the people who signed up in a given week, how many did an activity 1, 2 and 4 weeks later.
create view insights.retention as
  with cohorts as (
    select p.id, date_trunc('week', p.created_at)::date as signup_week, p.created_at
    from public.profiles p
  )
  select
    c.signup_week,
    count(*) as people,
    round(100.0 * count(*) filter (where exists (
      select 1 from public.activity_logs l where l.user_id = c.id
        and l.completed_at >= c.created_at + interval '7 days' and l.completed_at < c.created_at + interval '14 days'
    )) / count(*)) as week_1_pct,
    round(100.0 * count(*) filter (where exists (
      select 1 from public.activity_logs l where l.user_id = c.id
        and l.completed_at >= c.created_at + interval '14 days' and l.completed_at < c.created_at + interval '21 days'
    )) / count(*)) as week_2_pct,
    round(100.0 * count(*) filter (where exists (
      select 1 from public.activity_logs l where l.user_id = c.id
        and l.completed_at >= c.created_at + interval '28 days' and l.completed_at < c.created_at + interval '35 days'
    )) / count(*)) as week_4_pct
  from cohorts c
  group by c.signup_week
  order by c.signup_week desc;

create view insights.totals as
  select
    (select count(*) from public.profiles) as people,
    (select count(*) from public.profiles where gathering_alerts) as with_gathering_alerts,
    (select count(distinct user_id) from public.push_devices) as with_push,
    (select count(distinct user_id) from public.activity_logs where completed_at > now() - interval '7 days') as active_last_7_days,
    (select count(*) from public.activity_logs) as activities_done,
    (select coalesce(sum(duration_minutes), 0) from public.activity_logs) as minutes_offline,
    (select count(*) from public.gatherings where not cancelled
       and starts_at + make_interval(mins => duration_minutes) > now()) as upcoming_gatherings,
    (select count(*) from public.gatherings where not cancelled
       and starts_at + make_interval(mins => duration_minutes) <= now()) as past_gatherings,
    (select round(avg(attendee_count), 1) from public.gatherings where not cancelled
       and starts_at + make_interval(mins => duration_minutes) <= now()) as avg_people_per_gathering,
    (select round(100.0 * count(*) filter (where attendee_count >= 2) / nullif(count(*), 0)) from public.gatherings
     where not cancelled and starts_at + make_interval(mins => duration_minutes) <= now()) as pct_gatherings_with_a_guest,
    (select count(*) from public.reports where resolved_at is null) as open_reports;

create view insights.top_activities as
  select activity_id, max(title) as title, count(*) as times_done, count(distinct user_id) as people
  from public.activity_logs
  where completed_at > now() - interval '30 days'
  group by activity_id
  order by times_done desc;

revoke all on all tables in schema insights from public, anon, authenticated, service_role;
