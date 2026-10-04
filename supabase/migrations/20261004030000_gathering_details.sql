-- Meeting spots, attendee names for hosts, and telling attendees when a gathering is cancelled.

alter table public.gatherings
  add column meeting_note text not null default '' check (char_length(meeting_note) <= 140);

-- The list functions gain meeting_note, which changes their return type.
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
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.starts_at, g.duration_minutes,
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

create function public.my_upcoming_gatherings()
returns table (
  id uuid,
  host_id uuid,
  host_name text,
  title text,
  details text,
  meeting_note text,
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
    g.id, g.host_id, g.host_name, g.title, g.details, g.meeting_note, g.starts_at, g.duration_minutes,
    g.place_name, g.place_address, g.lat, g.lng, g.capacity, g.attendee_count,
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

-- First names of the people going, for the host only. Profiles are otherwise private.
create or replace function public.gathering_attendees(p_gathering_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.user_id, coalesce(p.display_name, 'Someone'), r.created_at
  from public.gatherings g
  join public.gathering_rsvps r on r.gathering_id = g.id
  left join public.profiles p on p.id = r.user_id
  where g.id = p_gathering_id
    and g.host_id = (select auth.uid())
    and r.user_id <> g.host_id
  order by r.created_at;
$$;

revoke execute on function public.gathering_attendees(uuid) from public, anon;
grant execute on function public.gathering_attendees(uuid) to authenticated;

-- Cancellation alerts (server-only) -----------------------------------------------------------

create table public.cancel_alerts_sent (
  gathering_id uuid primary key references public.gatherings (id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table public.cancel_alerts_sent enable row level security;

-- Everyone who was going to a gathering the host just cancelled. Fires once per gathering.
create or replace function public.claim_cancel_alert(p_gathering_id uuid, p_host_id uuid)
returns table (token text, environment text, gathering_title text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  g public.gatherings%rowtype;
begin
  select * into g from public.gatherings where id = p_gathering_id;
  if not found or not g.cancelled or g.host_id <> p_host_id
     or g.starts_at + make_interval(mins => g.duration_minutes) < now() then
    return;
  end if;

  insert into public.cancel_alerts_sent (gathering_id) values (g.id) on conflict do nothing;
  if not found then
    return;
  end if;

  return query
  select d.token, d.environment, g.title
  from public.gathering_rsvps r
  join public.push_devices d on d.user_id = r.user_id
  where r.gathering_id = g.id and r.user_id <> g.host_id;
end $$;

revoke execute on function public.claim_cancel_alert(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_cancel_alert(uuid, uuid) to service_role;
