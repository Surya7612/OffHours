-- Push alerts: "new gathering near you" (opt-in, at most one a day) and "someone joined your
-- gathering". Delivery happens in the gathering-alerts Edge Function; these functions decide
-- who gets what and make sure each alert is only ever sent once.

alter table public.profiles
  add column gathering_alerts boolean not null default false,
  add column alert_lat double precision check (alert_lat between -90 and 90),
  add column alert_lng double precision check (alert_lng between -180 and 180);

-- Alert locations are kept to roughly 1 km so nobody's home can be pinpointed, and are
-- cleared when alerts are turned off.
create or replace function public.profiles_alert_location() returns trigger
language plpgsql as $$
begin
  if not new.gathering_alerts then
    new.alert_lat = null;
    new.alert_lng = null;
  else
    new.alert_lat = round(new.alert_lat::numeric, 2)::double precision;
    new.alert_lng = round(new.alert_lng::numeric, 2)::double precision;
  end if;
  return new;
end $$;

create trigger profiles_alert_location before insert or update on public.profiles
  for each row execute function public.profiles_alert_location();

-- Devices ------------------------------------------------------------------------------------

create table public.push_devices (
  token text primary key check (char_length(token) between 32 and 200),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  environment text not null check (environment in ('sandbox', 'production')),
  updated_at timestamptz not null default now()
);

create index push_devices_user on public.push_devices (user_id);

alter table public.push_devices enable row level security;

create policy "Own devices" on public.push_devices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A token that moves to a different account (shared phone) belongs to the new account.
create or replace function public.register_push_device(p_token text, p_environment text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into public.push_devices (token, user_id, environment, updated_at)
  values (p_token, auth.uid(), p_environment, now())
  on conflict (token) do update
    set user_id = excluded.user_id, environment = excluded.environment, updated_at = now();
end $$;

revoke execute on function public.register_push_device(text, text) from public, anon;
grant execute on function public.register_push_device(text, text) to authenticated;

-- Bookkeeping, server-only (RLS on, no policies) ------------------------------------------

create table public.gathering_alerts_sent (
  gathering_id uuid primary key references public.gatherings (id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table public.gathering_alerts_sent enable row level security;

create table public.join_alerts_sent (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (gathering_id, user_id)
);
alter table public.join_alerts_sent enable row level security;

create table public.gathering_alert_throttle (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_sent_at timestamptz not null
);
alter table public.gathering_alert_throttle enable row level security;

-- Who to tell about a new gathering. Claims the gathering so a second call returns nobody,
-- and stamps each recipient so they get at most one gathering alert a day.
create or replace function public.claim_new_gathering_alerts(p_gathering_id uuid, p_host_id uuid)
returns table (user_id uuid, token text, environment text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  g public.gatherings%rowtype;
begin
  select * into g from public.gatherings where id = p_gathering_id;
  if not found or g.host_id <> p_host_id or g.cancelled or g.starts_at < now()
     or g.starts_at > now() + interval '7 days' then
    return;
  end if;

  insert into public.gathering_alerts_sent (gathering_id) values (g.id) on conflict do nothing;
  if not found then
    return;
  end if;

  return query
  with recipients as (
    select p.id
    from public.profiles p
    where p.gathering_alerts
      and p.alert_lat is not null
      and p.id <> g.host_id
      and not exists (
        select 1 from public.gathering_alert_throttle t
        where t.user_id = p.id and t.last_sent_at > now() - interval '20 hours'
      )
      and 6371 * 2 * asin(sqrt(
            power(sin(radians(g.lat - p.alert_lat) / 2), 2)
            + cos(radians(p.alert_lat)) * cos(radians(g.lat)) * power(sin(radians(g.lng - p.alert_lng) / 2), 2)
          )) <= p.radius_km
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = p.id and b.blocked_id = g.host_id)
           or (b.blocker_id = g.host_id and b.blocked_id = p.id)
      )
    limit 500
  ),
  stamped as (
    insert into public.gathering_alert_throttle (user_id, last_sent_at)
    select r.id, now() from recipients r
    on conflict (user_id) do update set last_sent_at = excluded.last_sent_at
    returning gathering_alert_throttle.user_id
  )
  select d.user_id, d.token, d.environment
  from public.push_devices d
  join stamped s on s.user_id = d.user_id;
end $$;

-- Who to tell that someone joined. Only fires once per person per gathering, so leaving and
-- rejoining doesn't spam the host.
create or replace function public.claim_join_alert(p_gathering_id uuid, p_joiner_id uuid)
returns table (token text, environment text, joiner_name text, gathering_title text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  g public.gatherings%rowtype;
  joiner text;
begin
  select * into g from public.gatherings where id = p_gathering_id;
  if not found or g.cancelled or g.host_id = p_joiner_id then
    return;
  end if;
  if not exists (
    select 1 from public.gathering_rsvps r where r.gathering_id = g.id and r.user_id = p_joiner_id
  ) then
    return;
  end if;

  insert into public.join_alerts_sent (gathering_id, user_id) values (g.id, p_joiner_id) on conflict do nothing;
  if not found then
    return;
  end if;

  select p.display_name into joiner from public.profiles p where p.id = p_joiner_id;

  return query
  select d.token, d.environment, coalesce(joiner, 'Someone'), g.title
  from public.push_devices d
  where d.user_id = g.host_id;
end $$;

revoke execute on function public.claim_new_gathering_alerts(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.claim_join_alert(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_new_gathering_alerts(uuid, uuid) to service_role;
grant execute on function public.claim_join_alert(uuid, uuid) to service_role;
