-- Moderation and abuse limits (App Store guideline 1.2: act on reports within 24 hours).
--
-- Moderators get a push for every new report. Everything else is done from the Supabase SQL
-- editor with the functions in the `moderation` schema, which the app's API can't reach:
--
--   select * from moderation.open_reports;
--   select moderation.hide_gathering('<gathering id>', 'Spam');
--   select moderation.ban_user('<user id>', 'Harassment');
--   select moderation.resolve_report('<report id>', 'No action needed');
--
-- Make yourself a moderator once:
--   insert into moderation.moderators (user_id) values ('<your user id>');

create schema if not exists moderation;
revoke all on schema moderation from public;

create table moderation.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create table moderation.banned_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null,
  banned_at timestamptz not null default now()
);

alter table public.reports
  add column notified_at timestamptz,
  add column resolution text;

-- Hosts cancel instead of deleting, so cancelled gatherings still count toward the limits
-- below. Account deletion still removes them through the cascade.
drop policy "Hosts delete their gatherings" on public.gatherings;

-- Limits on hosting ---------------------------------------------------------------------------

create or replace function public.gatherings_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from moderation.banned_users b where b.user_id = new.host_id) then
    raise exception 'Your account can no longer host gatherings';
  end if;
  if new.starts_at > now() + interval '30 days' then
    raise exception 'Gatherings can be scheduled up to 30 days ahead';
  end if;
  if (select count(*) from public.gatherings g
      where g.host_id = new.host_id and g.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'You can host up to 3 gatherings a day';
  end if;
  if (select count(*) from public.gatherings g
      where g.host_id = new.host_id and not g.cancelled
        and g.starts_at + make_interval(mins => g.duration_minutes) > now()) >= 5 then
    raise exception 'You can have up to 5 upcoming gatherings at a time';
  end if;
  return new;
end $$;

create trigger gatherings_limits before insert on public.gatherings
  for each row execute function public.gatherings_limits();

create or replace function public.gathering_rsvps_banned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from moderation.banned_users b where b.user_id = new.user_id) then
    raise exception 'Your account can no longer join gatherings';
  end if;
  return new;
end $$;

create trigger gathering_rsvps_banned before insert on public.gathering_rsvps
  for each row execute function public.gathering_rsvps_banned();

-- Limits on reports ---------------------------------------------------------------------------

create or replace function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.notified_at = null;
  new.resolved_at = null;
  new.resolution = null;
  if (select count(*) from public.reports r
      where r.reporter_id = new.reporter_id and r.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'You''ve sent a lot of reports today. Email us if something urgent is happening.';
  end if;
  return new;
end $$;

create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

-- Telling moderators about a report. Fires once per report, only for the person who filed it.
create or replace function public.claim_report_alert(p_report_id uuid, p_reporter_id uuid)
returns table (token text, environment text, reason text, gathering_id uuid, gathering_title text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  r public.reports%rowtype;
begin
  update public.reports
  set notified_at = now()
  where id = p_report_id and reporter_id = p_reporter_id and notified_at is null
  returning * into r;
  if not found then
    return;
  end if;

  return query
  select d.token, d.environment, r.reason, r.gathering_id, g.title
  from moderation.moderators m
  join public.push_devices d on d.user_id = m.user_id
  left join public.gatherings g on g.id = r.gathering_id;
end $$;

revoke execute on function public.claim_report_alert(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_report_alert(uuid, uuid) to service_role;

-- Moderator tools (SQL editor only) -----------------------------------------------------------

create view moderation.open_reports as
  select
    r.id as report_id,
    r.created_at,
    r.reason,
    reporter.display_name as reporter,
    r.reported_user_id,
    reported.display_name as reported_user,
    (select count(*) from public.reports o
     where o.reported_user_id = r.reported_user_id and o.resolved_at is null) as open_reports_on_user,
    r.gathering_id,
    g.title as gathering_title,
    g.details as gathering_details,
    g.cancelled as gathering_hidden
  from public.reports r
  left join public.profiles reporter on reporter.id = r.reporter_id
  left join public.profiles reported on reported.id = r.reported_user_id
  left join public.gatherings g on g.id = r.gathering_id
  where r.resolved_at is null
  order by r.created_at;

create or replace function moderation.resolve_report(p_report_id uuid, p_resolution text)
returns void language sql security definer set search_path = public as $$
  update public.reports set resolved_at = now(), resolution = p_resolution
  where id = p_report_id;
$$;

create or replace function moderation.hide_gathering(p_gathering_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.gatherings set cancelled = true where id = p_gathering_id;
  update public.reports set resolved_at = now(), resolution = 'Gathering hidden: ' || p_resolution
  where gathering_id = p_gathering_id and resolved_at is null;
end $$;

-- Stops someone from hosting, joining or being alerted, cancels what they host, signs them
-- out everywhere and blocks future sign-ins.
create or replace function moderation.ban_user(p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  insert into moderation.banned_users (user_id, reason) values (p_user_id, p_reason)
  on conflict (user_id) do update set reason = excluded.reason;

  update public.gatherings set cancelled = true
  where host_id = p_user_id and not cancelled
    and starts_at + make_interval(mins => duration_minutes) > now();
  delete from public.gathering_rsvps r
  using public.gatherings g
  where r.gathering_id = g.id and r.user_id = p_user_id and g.starts_at > now();
  update public.profiles set gathering_alerts = false where id = p_user_id;
  delete from public.push_devices where user_id = p_user_id;

  update public.reports set resolved_at = now(), resolution = 'User banned: ' || p_reason
  where reported_user_id = p_user_id and resolved_at is null;

  begin
    update auth.users set banned_until = now() + interval '100 years' where id = p_user_id;
    if to_regclass('auth.sessions') is not null then
      execute 'delete from auth.sessions where user_id = $1' using p_user_id;
    end if;
  exception when insufficient_privilege then
    raise warning 'Banned in OffHours, but could not lock the sign-in. Ban them under Authentication > Users too.';
  end;
end $$;

create or replace function moderation.unban_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from moderation.banned_users where user_id = p_user_id;
  update auth.users set banned_until = null where id = p_user_id;
end $$;

revoke all on all tables in schema moderation from public, anon, authenticated, service_role;
revoke execute on all functions in schema moderation from public, anon, authenticated, service_role;
