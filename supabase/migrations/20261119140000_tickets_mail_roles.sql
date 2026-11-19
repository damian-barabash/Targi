-- Bilety (zamówienia, bilety z kodem QR, wejścia), powiadomienia e-mail, nowe role: skaner i sprzedawca.

-- ───────────────────────── Role ─────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','exhibitors','tickets','marketing','reports','scanner','sales'));

-- Skaner widzi wyłącznie skaner biletów: nie jest „personelem” dla reszty danych panelu.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() not in ('scanner'), false)
$$;

create or replace function public.crm_can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','exhibitors','marketing','tickets','sales')
$$;

create or replace function public.crm_merge_contacts(p_keep uuid, p_drop uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.crm_contacts;
begin
  if public.my_role() not in ('admin','marketing','exhibitors','sales') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_keep = p_drop then return; end if;
  select * into d from public.crm_contacts where id = p_drop;
  if d.id is null then raise exception 'not found'; end if;
  update public.crm_contacts set email = null where id = p_drop;
  update public.crm_activities set contact_id = p_keep where contact_id = p_drop;
  update public.leads set contact_id = p_keep where contact_id = p_drop;
  update public.crm_contacts k set
    name = case when k.name = '' then d.name else k.name end,
    phone = coalesce(k.phone, d.phone), position = coalesce(k.position, d.position),
    company_id = coalesce(k.company_id, d.company_id), email = coalesce(k.email, d.email),
    tags = (select array_agg(distinct x) from unnest(k.tags || d.tags) x),
    sources = (select array_agg(distinct x) from unnest(k.sources || d.sources) x),
    newsletter = k.newsletter or d.newsletter,
    newsletter_segments = (select coalesce(array_agg(distinct x), '{}') from unnest(k.newsletter_segments || d.newsletter_segments) x),
    orders_count = k.orders_count + d.orders_count, orders_total = k.orders_total + d.orders_total,
    notes = nullif(concat_ws(E'\n\n', k.notes, d.notes), '')
  where k.id = p_keep;
  delete from public.crm_contacts where id = p_drop;
  insert into public.crm_activities (contact_id, type, body) values (p_keep, 'system', 'merge:' || coalesce(nullif(d.name, ''), d.email, ''));
  perform public.crm_refresh(p_keep, null);
end $$;

-- ───────────────────────── Ustawienia (tylko admin) ─────────────────────────
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security;
drop policy if exists "admin all settings" on public.app_settings;
create policy "admin all settings" on public.app_settings for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
grant select, insert, update on public.app_settings to authenticated;
revoke all on public.app_settings from anon;
insert into public.app_settings (key, value) values ('notify', jsonb_build_object(
  'ticket', '[]'::jsonb, 'lead', '[]'::jsonb, 'newsletter', '[]'::jsonb,
  'welcome', true, 'replyTo', 'kontakt@ohtargi.pl'
)) on conflict (key) do nothing;

-- ───────────────────────── Zamówienia i bilety ─────────────────────────
create sequence if not exists public.order_no_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('BH-' || nextval('public.order_no_seq')::text),
  created_at timestamptz not null default now(),
  edition_id uuid references public.editions (id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  kind text not null default 'sale' check (kind in ('sale','manual','invitation')),
  buyer_name text not null default '' check (char_length(buyer_name) <= 160),
  buyer_email text not null check (buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  buyer_phone text check (char_length(buyer_phone) <= 40),
  company text check (char_length(company) <= 200),
  nip text check (char_length(nip) <= 20),
  total numeric(10,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  locale text not null default 'pl' check (locale in ('pl','en')),
  payment_ref text,
  paid_at timestamptz,
  emailed_at timestamptz,
  note text check (char_length(note) <= 1000),
  created_by uuid,
  contact_id uuid references public.crm_contacts (id) on delete set null
);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  type_id text not null,
  type_name text not null,
  valid_dates date[] not null,
  catering boolean not null default false,
  reentry boolean not null default true,
  holder_name text check (char_length(holder_name) <= 160),
  price numeric(10,2) not null default 0,
  status text not null default 'valid' check (status in ('valid','cancelled')),
  entries int not null default 0,
  last_entry_at timestamptz
);
create index if not exists tickets_order_idx on public.tickets (order_id);

create table if not exists public.check_ins (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Europe/Warsaw')::date),
  ticket_id uuid references public.tickets (id) on delete cascade,
  code text,
  result text not null check (result in ('ok','reentry','again','not_today','cancelled','unknown','forced')),
  by_user uuid,
  by_name text
);
create index if not exists check_ins_ticket_idx on public.check_ins (ticket_id, at desc);
create index if not exists check_ins_day_idx on public.check_ins (day, at desc);

alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.check_ins enable row level security;
drop policy if exists "sales read orders" on public.orders;
create policy "sales read orders" on public.orders for select to authenticated using (public.my_role() in ('admin','tickets','reports','sales'));
drop policy if exists "sales read tickets" on public.tickets;
create policy "sales read tickets" on public.tickets for select to authenticated using (public.my_role() in ('admin','tickets','reports','sales'));
drop policy if exists "staff read checkins" on public.check_ins;
create policy "staff read checkins" on public.check_ins for select to authenticated using (public.my_role() in ('admin','tickets','reports'));
grant select on public.orders, public.tickets, public.check_ins to authenticated;
revoke all on public.orders, public.tickets, public.check_ins from anon;

-- Anulowanie / przywrócenie biletu z panelu.
create or replace function public.ticket_set_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() not in ('admin','tickets') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('valid','cancelled') then raise exception 'bad status'; end if;
  update public.tickets set status = p_status where id = p_id;
  perform public.log_action('update', 'ticket', p_id::text, 'status: ' || p_status);
end $$;

-- Kod z QR: sam kod albo cały link …/bilet/?k=KOD.
create or replace function public.ticket_code(p text) returns text
language sql immutable as $$
  select upper(regexp_replace(coalesce(substring(p from '[?&]k=([A-Za-z0-9-]+)'), p), '[^A-Za-z0-9]', '', 'g'))
$$;

-- Wejście na targi: sprawdzenie kodu przy bramce.
create or replace function public.check_in(p_code text, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.my_role();
  v_code text := public.ticket_code(p_code);
  t public.tickets; o public.orders;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
  v_first timestamptz; v_res text; v_name text;
begin
  if v_role not in ('admin','tickets','scanner') then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(nullif(name, ''), email) into v_name from public.profiles where id = auth.uid();
  select * into t from public.tickets where replace(code, '-', '') = v_code;
  if t.id is null then
    insert into public.check_ins (code, result, by_user, by_name) values (left(v_code, 40), 'unknown', auth.uid(), v_name);
    return jsonb_build_object('result', 'unknown', 'code', v_code);
  end if;
  select * into o from public.orders where id = t.order_id;
  select min(at) into v_first from public.check_ins where ticket_id = t.id and day = v_today and result in ('ok','reentry','forced');

  if t.status <> 'valid' or o.status <> 'paid' then v_res := 'cancelled';
  elsif not (v_today = any (t.valid_dates)) and not p_force then v_res := 'not_today';
  elsif not (v_today = any (t.valid_dates)) and p_force then
    if v_role = 'scanner' then raise exception 'forbidden' using errcode = '42501'; end if;
    v_res := 'forced';
  elsif v_first is not null and not t.reentry then v_res := 'again';
  elsif v_first is not null then v_res := 'reentry';
  else v_res := 'ok';
  end if;

  insert into public.check_ins (ticket_id, code, result, by_user, by_name) values (t.id, t.code, v_res, auth.uid(), v_name);
  if v_res in ('ok','reentry','forced') then
    update public.tickets set entries = entries + 1, last_entry_at = now() where id = t.id;
  end if;
  return jsonb_build_object(
    'result', v_res, 'code', t.code, 'type', t.type_name, 'holder', coalesce(nullif(t.holder_name, ''), o.buyer_name),
    'dates', t.valid_dates, 'catering', t.catering, 'reentry', t.reentry, 'first', v_first, 'order', o.number, 'kind', o.kind,
    'entries', t.entries + case when v_res in ('ok','reentry','forced') then 1 else 0 end
  );
end $$;
revoke all on function public.check_in(text, boolean) from public, anon;
grant execute on function public.check_in(text, boolean) to authenticated;

create or replace function public.scan_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.my_role() not in ('admin','tickets','scanner') then null else jsonb_build_object(
    'today', (select count(*) from public.check_ins where day = (now() at time zone 'Europe/Warsaw')::date and result in ('ok','forced')),
    'reentry', (select count(*) from public.check_ins where day = (now() at time zone 'Europe/Warsaw')::date and result = 'reentry'),
    'rejected', (select count(*) from public.check_ins where day = (now() at time zone 'Europe/Warsaw')::date and result in ('again','cancelled','unknown')),
    'mine', (select count(*) from public.check_ins where day = (now() at time zone 'Europe/Warsaw')::date and by_user = auth.uid() and result in ('ok','reentry','forced'))
  ) end
$$;
revoke all on function public.scan_stats() from public, anon;
grant execute on function public.scan_stats() to authenticated;

-- Publiczny podgląd biletu (strona /bilet/?k=…): bez e-maila i telefonu. Kod jest losowy (nie do zgadnięcia).
create or replace function public.ticket_public(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', t.code, 'type', t.type_name, 'holder', coalesce(nullif(t.holder_name, ''), o.buyer_name),
    'dates', t.valid_dates, 'catering', t.catering, 'status', case when t.status = 'valid' and o.status = 'paid' then 'valid' else 'cancelled' end,
    'order', o.number, 'locale', o.locale)
  from public.tickets t join public.orders o on o.id = t.order_id
  where replace(t.code, '-', '') = public.ticket_code(p_code)
$$;
revoke all on function public.ticket_public(text) from public;
grant execute on function public.ticket_public(text) to anon, authenticated;

-- ───────────────────────── Haki e-mail (pg_net → Edge Function notify) ─────────────────────────
create extension if not exists pg_net with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.hook (id int primary key default 1 check (id = 1), url text not null, secret text not null);

create or replace function public.mail_hook(p_event text, p_id text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare h private.hook;
begin
  select * into h from private.hook where id = 1;
  if h.url is null then return; end if;
  perform net.http_post(
    url := h.url,
    body := jsonb_build_object('event', p_event, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', h.secret),
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'mail_hook: %', sqlerrm;
end $$;
revoke all on function public.mail_hook(text, text) from public, anon, authenticated;

create or replace function public.mail_on_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.mail_hook(tg_argv[0], new.id::text);
  return null;
end $$;
drop trigger if exists mail_lead on public.leads;
create trigger mail_lead after insert on public.leads for each row execute function public.mail_on_insert('lead');
drop trigger if exists mail_newsletter on public.newsletter_subscribers;
create trigger mail_newsletter after insert on public.newsletter_subscribers for each row execute function public.mail_on_insert('newsletter');

notify pgrst, 'reload schema';
-- service role (Edge Functions) może zapisywać zakupy w CRM
grant execute on function public.crm_record_order(text, text, text, text, text, numeric, text, text, text) to service_role;
grant execute on function public.crm_upsert_contact(text, text, text, text, text, text, text, text, text) to service_role;

-- każdy (także skaner) widzi własny profil
drop policy if exists "read own profile" on public.profiles; create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
