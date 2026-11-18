-- Panel administracyjny: role, treści (wersja robocza → publikacja), edycje, media,
-- historia zmian, CRM zgłoszeń, statystyki odwiedzin i banerów.
-- Zasada (Supabase Free): strona publiczna NIE czyta bazy. Build pobiera jedną migawkę (published_site),
-- a z przeglądarki gościa idą tylko małe wywołania track_* i zapisy formularzy.

-- ───────────────────────── Role ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'reports' check (role in ('admin','exhibitors','tickets','marketing','reports')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
alter table public.profiles enable row level security;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() is not null
$$;

-- Które sekcje treści może zapisywać dana rola.
create or replace function public.can_edit_key(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.my_role()
    when 'admin' then true
    when 'marketing' then p_key like 'page:%' or p_key in ('nav','settings','posts','faq','banners','faces','experts','program','zones','stats','partners')
    when 'exhibitors' then p_key in ('exhibitors','partners','zones')
    when 'tickets' then p_key in ('event','tickets','ticketDays','catering','masterclasses','promoCodes')
    else false
  end
$$;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff());
grant select on public.profiles to authenticated;

-- ───────────────────────── Historia zmian ─────────────────────────
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  action text not null,
  entity text not null,
  entity_key text,
  summary text
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
drop policy if exists "staff read audit" on public.audit_log;
create policy "staff read audit" on public.audit_log for select to authenticated using (public.is_staff());
grant select on public.audit_log to authenticated;

create or replace function public.log_action(p_action text, p_entity text, p_key text, p_summary text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (user_id, user_email, action, entity, entity_key, summary)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), p_action, p_entity, p_key, left(p_summary, 600));
end $$;
revoke all on function public.log_action(text, text, text, text) from public, anon, authenticated;

-- ───────────────────────── Edycje ─────────────────────────
create table if not exists public.editions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  year int not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists editions_one_current on public.editions (is_current) where is_current;
alter table public.editions enable row level security;
drop policy if exists "staff read editions" on public.editions;
create policy "staff read editions" on public.editions for select to authenticated using (public.is_staff());
grant select on public.editions to authenticated;

-- ───────────────────────── Treści (wersja robocza) ─────────────────────────
-- scope = 'global' albo id edycji; key = sekcja ('tickets', 'nav', 'page:<id>' …); data = JSON sekcji.
create table if not exists public.content (
  scope text not null,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (scope, key)
);
alter table public.content enable row level security;
drop policy if exists "staff read content" on public.content;
create policy "staff read content" on public.content for select to authenticated using (public.is_staff());
grant select on public.content to authenticated;

create or replace function public.save_content(p_scope text, p_key text, p_data jsonb, p_summary text default null, p_expected timestamptz default null)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now(); v_cur timestamptz;
begin
  if not public.can_edit_key(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_scope <> 'global' and not exists (select 1 from public.editions where id::text = p_scope) then
    raise exception 'unknown scope';
  end if;
  if pg_column_size(p_data) > 900000 then raise exception 'too large'; end if;
  select updated_at into v_cur from public.content where scope = p_scope and key = p_key;
  if p_expected is not null and v_cur is not null and v_cur <> p_expected then
    raise exception 'conflict' using errcode = '40001';
  end if;
  insert into public.content (scope, key, data, updated_at, updated_by)
  values (p_scope, p_key, p_data, v_now, auth.uid())
  on conflict (scope, key) do update set data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  perform public.log_action(case when v_cur is null then 'create' else 'update' end, 'content', p_key, p_summary);
  return v_now;
end $$;

create or replace function public.delete_content(p_scope text, p_key text, p_summary text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_key(p_key) or p_key not like 'page:%' then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.content where scope = p_scope and key = p_key;
  perform public.log_action('delete', 'content', p_key, p_summary);
end $$;

create or replace function public.create_edition(p_name text, p_year int, p_copy_from uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.my_role() not in ('admin','tickets') then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.editions (name, year) values (p_name, p_year) returning id into v_id;
  if p_copy_from is not null then
    insert into public.content (scope, key, data, updated_by)
    select v_id::text, key, data, auth.uid() from public.content where scope = p_copy_from::text;
  end if;
  perform public.log_action('create', 'edition', v_id::text, p_name);
  return v_id;
end $$;

create or replace function public.update_edition(p_id uuid, p_name text, p_year int, p_current boolean default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() not in ('admin','tickets') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_current then
    if public.my_role() <> 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
    update public.editions set is_current = false where is_current and id <> p_id;
  end if;
  update public.editions set name = p_name, year = p_year, is_current = coalesce(p_current, is_current) or is_current where id = p_id;
  perform public.log_action('update', 'edition', p_id::text, p_name || case when p_current then ' (aktualna)' else '' end);
end $$;

create or replace function public.delete_edition(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.editions where id = p_id and is_current) then raise exception 'current edition'; end if;
  delete from public.content where scope = p_id::text;
  delete from public.editions where id = p_id;
  perform public.log_action('delete', 'edition', p_id::text, null);
end $$;

-- ───────────────────────── Publikacja ─────────────────────────
create table if not exists public.snapshots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  created_by uuid,
  created_email text,
  note text,
  data jsonb not null
);
alter table public.snapshots enable row level security;
drop policy if exists "staff read snapshots" on public.snapshots;
create policy "staff read snapshots" on public.snapshots for select to authenticated using (public.is_staff());
grant select on public.snapshots to authenticated;

-- Składa migawkę z wersji roboczej: sekcje globalne + sekcje aktualnej edycji + strony.
-- Kody rabatowe (promoCodes) nigdy nie trafiają do publicznej migawki.
create or replace function public.build_site() returns jsonb
language sql stable security definer set search_path = public as $$
  with cur as (select id, name, year from public.editions where is_current limit 1)
  select
    coalesce((select jsonb_object_agg(key, data) from public.content
              where scope = 'global' and key not like 'page:%'), '{}'::jsonb)
    || coalesce((select jsonb_object_agg(c.key, c.data) from public.content c, cur
              where c.scope = cur.id::text and c.key <> 'promoCodes'), '{}'::jsonb)
    || jsonb_build_object(
      'pages', coalesce((select jsonb_agg(data order by (data->>'order')::numeric nulls last, key) from public.content
                         where scope = 'global' and key like 'page:%'), '[]'::jsonb),
      'edition', (select jsonb_build_object('id', id, 'name', name, 'year', year) from cur)
    )
$$;
revoke all on function public.build_site() from public, anon, authenticated;

create or replace function public.publish_site(p_note text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if public.my_role() is null or public.my_role() = 'reports' then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.snapshots (created_by, created_email, note, data)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), left(p_note, 300), public.build_site())
  returning id into v_id;
  delete from public.snapshots where id < v_id - 40;
  delete from public.audit_log where at < now() - interval '18 months';
  perform public.log_action('publish', 'site', v_id::text, p_note);
  return v_id;
end $$;

-- Jedyny odczyt treści dostępny bez logowania: ostatnia opublikowana migawka (używa jej build strony).
create or replace function public.published_site() returns jsonb
language sql stable security definer set search_path = public as $$
  select data || jsonb_build_object('publishedAt', created_at, 'snapshotId', id)
  from public.snapshots order by id desc limit 1
$$;
grant execute on function public.published_site() to anon, authenticated;

-- Przywraca migawkę do wersji roboczej (potem trzeba opublikować).
create or replace function public.restore_snapshot(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v jsonb; v_ed text; r record;
begin
  if public.my_role() <> 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
  select data into v from public.snapshots where id = p_id;
  if v is null then raise exception 'not found'; end if;
  select id::text into v_ed from public.editions where is_current;
  delete from public.content where scope = 'global' and key like 'page:%';
  for r in select value from jsonb_array_elements(v->'pages') loop
    insert into public.content (scope, key, data, updated_by) values ('global', 'page:' || (r.value->>'id'), r.value, auth.uid());
  end loop;
  for r in select key, value from jsonb_each(v) where key in ('nav','settings','posts','faq','banners') loop
    insert into public.content (scope, key, data, updated_by) values ('global', r.key, r.value, auth.uid())
    on conflict (scope, key) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by;
  end loop;
  for r in select key, value from jsonb_each(v) where key in ('event','stats','tickets','ticketDays','catering','faces','zones','masterclasses','experts','program','exhibitors','partners') loop
    insert into public.content (scope, key, data, updated_by) values (v_ed, r.key, r.value, auth.uid())
    on conflict (scope, key) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by;
  end loop;
  perform public.log_action('restore', 'site', p_id::text, null);
end $$;

-- ───────────────────────── Media ─────────────────────────
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  alt text not null default '',
  width int,
  height int,
  bytes int,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
alter table public.media enable row level security;
drop policy if exists "staff read media" on public.media;
create policy "staff read media" on public.media for select to authenticated using (public.is_staff());
drop policy if exists "editors write media" on public.media;
create policy "editors write media" on public.media for all to authenticated
  using (public.my_role() in ('admin','marketing','exhibitors','tickets'))
  with check (public.my_role() in ('admin','marketing','exhibitors','tickets'));
grant select, insert, update, delete on public.media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 1500000, array['image/webp','image/svg+xml','image/png','image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1500000;

drop policy if exists "staff list media" on storage.objects;
create policy "staff list media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_staff());
drop policy if exists "editors upload media" on storage.objects;
create policy "editors upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.my_role() in ('admin','marketing','exhibitors','tickets'));
drop policy if exists "editors update media" on storage.objects;
create policy "editors update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.my_role() in ('admin','marketing','exhibitors','tickets'));
drop policy if exists "editors delete media" on storage.objects;
create policy "editors delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.my_role() in ('admin','marketing','exhibitors','tickets'));

-- ───────────────────────── Zgłoszenia (CRM) i newsletter ─────────────────────────
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists assigned_to uuid;
alter table public.leads add column if not exists updated_at timestamptz;

drop policy if exists "staff read leads" on public.leads;
create policy "staff read leads" on public.leads for select to authenticated using (public.is_staff());
drop policy if exists "crm update leads" on public.leads;
create policy "crm update leads" on public.leads for update to authenticated
  using (public.my_role() in ('admin','exhibitors','marketing'))
  with check (public.my_role() in ('admin','exhibitors','marketing'));
drop policy if exists "admin delete leads" on public.leads;
create policy "admin delete leads" on public.leads for delete to authenticated using (public.my_role() = 'admin');
grant select, update, delete on public.leads to authenticated;

create or replace function public.leads_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    perform public.log_action('update', 'lead', new.id::text, coalesce(new.company, new.name) || ': status ' || old.status || ' → ' || new.status);
  end if;
  return new;
end $$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads for each row execute function public.leads_touch();

drop policy if exists "staff read newsletter" on public.newsletter_subscribers;
create policy "staff read newsletter" on public.newsletter_subscribers for select to authenticated using (public.is_staff());
drop policy if exists "marketing delete newsletter" on public.newsletter_subscribers;
create policy "marketing delete newsletter" on public.newsletter_subscribers for delete to authenticated
  using (public.my_role() in ('admin','marketing'));
grant select, delete on public.newsletter_subscribers to authenticated;

-- ───────────────────────── Statystyki (tylko sumy dzienne) ─────────────────────────
create table if not exists public.visits_daily (
  day date not null,
  path text not null,
  lang text not null,
  device text not null,
  source text not null,
  views int not null default 0,
  visits int not null default 0,
  primary key (day, path, lang, device, source)
);
alter table public.visits_daily enable row level security;
drop policy if exists "staff read visits" on public.visits_daily;
create policy "staff read visits" on public.visits_daily for select to authenticated using (public.is_staff());
grant select on public.visits_daily to authenticated;

create or replace function public.track_visit(p_path text, p_lang text, p_device text, p_source text, p_new boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_path text := lower(left(coalesce(p_path, '/'), 120));
begin
  if v_path !~ '^/[a-z0-9/_-]*$' or v_path like '/admin%' then return; end if;
  if p_lang not in ('pl','en') or p_device not in ('mobile','tablet','desktop')
     or p_source not in ('direct','google','facebook','instagram','tiktok','search','other') then return; end if;
  -- ochrona przed zaśmiecaniem: powyżej 4000 wierszy dziennie nowe adresy trafiają do „/other”
  if (select count(*) from public.visits_daily where day = current_date) > 4000
     and not exists (select 1 from public.visits_daily where day = current_date and path = v_path) then
    v_path := '/other';
  end if;
  insert into public.visits_daily (day, path, lang, device, source, views, visits)
  values (current_date, v_path, p_lang, p_device, p_source, 1, case when p_new then 1 else 0 end)
  on conflict (day, path, lang, device, source)
  do update set views = visits_daily.views + 1, visits = visits_daily.visits + excluded.visits;
end $$;
grant execute on function public.track_visit(text, text, text, text, boolean) to anon, authenticated;

create table if not exists public.ad_stats_daily (
  day date not null,
  banner_id text not null,
  slot text not null,
  impressions int not null default 0,
  clicks int not null default 0,
  primary key (day, banner_id, slot)
);
alter table public.ad_stats_daily enable row level security;
drop policy if exists "staff read ad stats" on public.ad_stats_daily;
create policy "staff read ad stats" on public.ad_stats_daily for select to authenticated using (public.is_staff());
grant select on public.ad_stats_daily to authenticated;

-- p_events: [{ "b": "<id banera>", "s": "<miejsce>", "i": 1, "c": 0 }, …]
create or replace function public.track_ads(p_events jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb; n int := 0;
begin
  if jsonb_typeof(p_events) <> 'array' then return; end if;
  for e in select value from jsonb_array_elements(p_events) loop
    n := n + 1; exit when n > 30;
    if (e->>'b') !~ '^[A-Za-z0-9_-]{1,40}$' or (e->>'s') !~ '^[A-Za-z0-9_-]{1,60}$' then continue; end if;
    insert into public.ad_stats_daily (day, banner_id, slot, impressions, clicks)
    values (current_date, e->>'b', e->>'s', least(greatest(coalesce((e->>'i')::int, 0), 0), 3), least(greatest(coalesce((e->>'c')::int, 0), 0), 2))
    on conflict (day, banner_id, slot)
    do update set impressions = ad_stats_daily.impressions + excluded.impressions, clicks = ad_stats_daily.clicks + excluded.clicks;
  end loop;
end $$;
grant execute on function public.track_ads(jsonb) to anon, authenticated;

-- Jedno zapytanie dla pulpitu panelu.
create or replace function public.dashboard_stats(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d0 date := current_date - (least(greatest(p_days, 1), 366) - 1); p0 date;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  p0 := d0 - (current_date - d0 + 1);
  return jsonb_build_object(
    'from', d0,
    'visitsByDay', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', v, 'visits', s) order by day)
      from (select day, sum(views) as v, sum(visits) as s from public.visits_daily where day >= d0 group by day) x), '[]'::jsonb),
    'visitsPrev', (select jsonb_build_object('views', coalesce(sum(views), 0), 'visits', coalesce(sum(visits), 0))
      from public.visits_daily where day >= p0 and day < d0),
    'topPages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'views', v) order by v desc)
      from (select path, sum(views) as v from public.visits_daily where day >= d0 group by path order by v desc limit 8) x), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('k', source, 'v', v) order by v desc)
      from (select source, sum(visits) as v from public.visits_daily where day >= d0 group by source) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('k', device, 'v', v) order by v desc)
      from (select device, sum(visits) as v from public.visits_daily where day >= d0 group by device) x), '[]'::jsonb),
    'langs', coalesce((select jsonb_agg(jsonb_build_object('k', lang, 'v', v) order by v desc)
      from (select lang, sum(views) as v from public.visits_daily where day >= d0 group by lang) x), '[]'::jsonb),
    'leadsByDay', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'n', n) order by day)
      from (select created_at::date as day, kind, count(*) as n from public.leads where created_at::date >= d0 group by 1, 2) x), '[]'::jsonb),
    'leadsPrev', (select count(*) from public.leads where created_at::date >= p0 and created_at::date < d0),
    'leadsOpen', (select count(*) from public.leads where status = 'new'),
    'leadsTotal', (select count(*) from public.leads),
    'leadsByStatus', coalesce((select jsonb_agg(jsonb_build_object('k', status, 'v', n))
      from (select status, count(*) as n from public.leads group by status) x), '[]'::jsonb),
    'subsByDay', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'n', n) order by day)
      from (select created_at::date as day, count(*) as n from public.newsletter_subscribers where created_at::date >= d0 group by 1) x), '[]'::jsonb),
    'subsPrev', (select count(*) from public.newsletter_subscribers where created_at::date >= p0 and created_at::date < d0),
    'subsTotal', (select count(*) from public.newsletter_subscribers),
    'subsBySegment', coalesce((select jsonb_agg(jsonb_build_object('k', segment, 'v', n))
      from (select segment, count(*) as n from public.newsletter_subscribers group by segment) x), '[]'::jsonb),
    'adsTotals', (select jsonb_build_object('impressions', coalesce(sum(impressions), 0), 'clicks', coalesce(sum(clicks), 0))
      from public.ad_stats_daily where day >= d0),
    'recentLeads', coalesce((select jsonb_agg(x order by x.created_at desc)
      from (select id, created_at, kind, name, company, status from public.leads order by created_at desc limit 6) x), '[]'::jsonb),
    'recentAudit', coalesce((select jsonb_agg(x order by x.at desc)
      from (select at, user_email, action, entity, entity_key, summary from public.audit_log order by at desc limit 8) x), '[]'::jsonb)
  );
end $$;

create or replace function public.touch_seen() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid()
$$;

revoke all on function public.save_content(text, text, jsonb, text, timestamptz) from public, anon;
revoke all on function public.delete_content(text, text, text) from public, anon;
revoke all on function public.create_edition(text, int, uuid) from public, anon;
revoke all on function public.update_edition(uuid, text, int, boolean) from public, anon;
revoke all on function public.delete_edition(uuid) from public, anon;
revoke all on function public.publish_site(text) from public, anon;
revoke all on function public.restore_snapshot(bigint) from public, anon;
revoke all on function public.dashboard_stats(int) from public, anon;
revoke all on function public.touch_seen() from public, anon;
grant execute on function public.save_content(text, text, jsonb, text, timestamptz),
  public.delete_content(text, text, text), public.create_edition(text, int, uuid),
  public.update_edition(uuid, text, int, boolean), public.delete_edition(uuid),
  public.publish_site(text), public.restore_snapshot(bigint), public.dashboard_stats(int),
  public.touch_seen(), public.my_role(), public.is_staff(), public.can_edit_key(text) to authenticated;

notify pgrst, 'reload schema';
