-- CRM: baza osób i firm + oś aktywności (notatki, rozmowy, zadania „oddzwonić”).
-- Osoby trafiają tu same: z formularzy (leads), z newslettera, a później z zamówień (crm_record_order).
-- Wszystko liczone w bazie, panel czyta tylko potrzebne kolumny (Supabase Free).

-- ───────────────────────── Tabele ─────────────────────────
create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  name_key text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  nip text check (char_length(nip) <= 20),
  kind text not null default 'other' check (kind in ('exhibitor','partner','media','salon','supplier','other')),
  website text check (char_length(website) <= 300),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 40),
  city text check (char_length(city) <= 120),
  address text check (char_length(address) <= 300),
  tags text[] not null default '{}',
  owner uuid references public.profiles (id) on delete set null,
  notes text check (char_length(notes) <= 8000),
  last_activity_at timestamptz not null default now()
);
create index if not exists crm_companies_name_idx on public.crm_companies (name_key);
create unique index if not exists crm_companies_nip_uq on public.crm_companies (nip) where nip is not null and nip <> '';

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text not null default '' check (char_length(name) <= 160),
  phone text check (char_length(phone) <= 40),
  position text check (char_length(position) <= 120),
  company_id uuid references public.crm_companies (id) on delete set null,
  stage text not null default 'new' check (stage in ('new','contacted','interested','client','inactive')),
  tags text[] not null default '{}',
  sources text[] not null default '{}',
  newsletter boolean not null default false,
  newsletter_segments text[] not null default '{}',
  orders_count int not null default 0,
  orders_total numeric(12,2) not null default 0,
  locale text not null default 'pl' check (locale in ('pl','en')),
  owner uuid references public.profiles (id) on delete set null,
  notes text check (char_length(notes) <= 8000),
  next_action_at timestamptz,
  next_action text,
  last_activity_at timestamptz not null default now()
);
create unique index if not exists crm_contacts_email_uq on public.crm_contacts (lower(email)) where email is not null;
create index if not exists crm_contacts_company_idx on public.crm_contacts (company_id);
create index if not exists crm_contacts_activity_idx on public.crm_contacts (last_activity_at desc);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_id uuid references public.crm_contacts (id) on delete cascade,
  company_id uuid references public.crm_companies (id) on delete cascade,
  type text not null check (type in ('note','call','email','meeting','task','lead','newsletter','order','stage','system')),
  outcome text check (outcome in ('talked','no_answer','callback','wrong_number','voicemail')),
  body text check (char_length(body) <= 4000),
  due_at timestamptz,
  done_at timestamptz,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid,
  created_email text,
  ref text,
  check (contact_id is not null or company_id is not null)
);
create index if not exists crm_act_contact_idx on public.crm_activities (contact_id, created_at desc);
create index if not exists crm_act_company_idx on public.crm_activities (company_id, created_at desc);
create index if not exists crm_act_open_tasks_idx on public.crm_activities (due_at) where type = 'task' and done_at is null;

alter table public.leads add column if not exists contact_id uuid references public.crm_contacts (id) on delete set null;

-- ───────────────────────── Uprawnienia ─────────────────────────
create or replace function public.crm_can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','exhibitors','marketing','tickets')
$$;

alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_activities enable row level security;

drop policy if exists "staff read" on public.crm_companies;
create policy "staff read" on public.crm_companies for select to authenticated using (public.is_staff());
drop policy if exists "crm insert" on public.crm_companies;
create policy "crm insert" on public.crm_companies for insert to authenticated with check (public.crm_can_write());
drop policy if exists "crm update" on public.crm_companies;
create policy "crm update" on public.crm_companies for update to authenticated using (public.crm_can_write()) with check (public.crm_can_write());
drop policy if exists "admin delete" on public.crm_companies;
create policy "admin delete" on public.crm_companies for delete to authenticated using (public.my_role() = 'admin');

drop policy if exists "staff read" on public.crm_contacts;
create policy "staff read" on public.crm_contacts for select to authenticated using (public.is_staff());
drop policy if exists "crm insert" on public.crm_contacts;
create policy "crm insert" on public.crm_contacts for insert to authenticated with check (public.crm_can_write());
drop policy if exists "crm update" on public.crm_contacts;
create policy "crm update" on public.crm_contacts for update to authenticated using (public.crm_can_write()) with check (public.crm_can_write());
drop policy if exists "admin delete" on public.crm_contacts;
create policy "admin delete" on public.crm_contacts for delete to authenticated using (public.my_role() = 'admin');

drop policy if exists "staff read" on public.crm_activities;
create policy "staff read" on public.crm_activities for select to authenticated using (public.is_staff());
drop policy if exists "crm insert" on public.crm_activities;
create policy "crm insert" on public.crm_activities for insert to authenticated
  with check (public.crm_can_write() and type in ('note','call','email','meeting','task'));
drop policy if exists "crm update" on public.crm_activities;
create policy "crm update" on public.crm_activities for update to authenticated
  using (public.crm_can_write() and (created_by = auth.uid() or type = 'task' or public.my_role() = 'admin'))
  with check (public.crm_can_write());
drop policy if exists "crm delete" on public.crm_activities;
create policy "crm delete" on public.crm_activities for delete to authenticated
  using (public.crm_can_write() and type in ('note','call','email','meeting','task') and (created_by = auth.uid() or public.my_role() = 'admin'));

grant select, insert, update, delete on public.crm_companies, public.crm_contacts, public.crm_activities to authenticated;
revoke all on public.crm_companies, public.crm_contacts, public.crm_activities from anon;

-- ───────────────────────── Automatyka ─────────────────────────
create or replace function public.crm_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists crm_contacts_touch on public.crm_contacts;
create trigger crm_contacts_touch before update on public.crm_contacts for each row execute function public.crm_touch();
drop trigger if exists crm_companies_touch on public.crm_companies;
create trigger crm_companies_touch before update on public.crm_companies for each row execute function public.crm_touch();

-- Autor wpisu, zmiana etapu → wpis na osi, historia zmian przy usuwaniu.
create or replace function public.crm_activity_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
    new.created_email := (select coalesce(nullif(name, ''), email) from public.profiles where id = auth.uid());
  end if;
  if new.type = 'task' and new.assigned_to is null then new.assigned_to := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists crm_activity_author on public.crm_activities;
create trigger crm_activity_author before insert on public.crm_activities for each row execute function public.crm_activity_author();

-- Po każdej zmianie aktywności: ostatni kontakt i najbliższe zadanie osoby / firmy.
create or replace function public.crm_refresh(p_contact uuid, p_company uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_contact is not null then
    update public.crm_contacts c set
      last_activity_at = coalesce((select max(created_at) from public.crm_activities where contact_id = c.id and type <> 'task'), c.created_at),
      next_action_at = t.due_at,
      next_action = t.body
    from (select (select due_at from public.crm_activities where contact_id = p_contact and type = 'task' and done_at is null order by due_at nulls last limit 1) as due_at,
                 (select body from public.crm_activities where contact_id = p_contact and type = 'task' and done_at is null order by due_at nulls last limit 1) as body) t
    where c.id = p_contact;
  end if;
  if p_company is not null then
    update public.crm_companies set last_activity_at = greatest(last_activity_at, now()) where id = p_company;
  end if;
end $$;

create or replace function public.crm_activity_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  perform public.crm_refresh(r.contact_id, coalesce(r.company_id, (select company_id from public.crm_contacts where id = r.contact_id)));
  return null;
end $$;
drop trigger if exists crm_activity_after on public.crm_activities;
create trigger crm_activity_after after insert or update or delete on public.crm_activities for each row execute function public.crm_activity_after();

create or replace function public.crm_contact_stage() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.crm_activities (contact_id, type, body) values (new.id, 'stage', old.stage || '→' || new.stage);
  end if;
  return new;
end $$;
drop trigger if exists crm_contact_stage on public.crm_contacts;
create trigger crm_contact_stage after update of stage on public.crm_contacts for each row execute function public.crm_contact_stage();

create or replace function public.crm_log_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_action('delete', tg_argv[0], old.id::text,
    case when tg_argv[0] = 'contact' then coalesce(nullif(old.name, ''), old.email) else old.name end);
  return old;
end $$;
drop trigger if exists crm_contacts_del on public.crm_contacts;
create trigger crm_contacts_del after delete on public.crm_contacts for each row execute function public.crm_log_delete('contact');
drop trigger if exists crm_companies_del on public.crm_companies;
create trigger crm_companies_del after delete on public.crm_companies for each row execute function public.crm_log_delete('company');

-- Znajdź albo załóż osobę (po e-mailu) i firmę (po NIP albo nazwie). Uzupełnia tylko puste pola.
create or replace function public.crm_upsert_contact(
  p_email text, p_name text default null, p_phone text default null, p_company text default null,
  p_nip text default null, p_locale text default 'pl', p_tag text default null, p_source text default null,
  p_company_kind text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_email text := nullif(lower(btrim(p_email)), ''); v_id uuid; v_co uuid; v_nip text := nullif(regexp_replace(coalesce(p_nip, ''), '[^0-9A-Za-z]', '', 'g'), '');
begin
  if nullif(btrim(coalesce(p_company, '')), '') is not null then
    if v_nip is not null then select id into v_co from public.crm_companies where nip = v_nip; end if;
    if v_co is null then
      select id into v_co from public.crm_companies where name_key = lower(regexp_replace(btrim(p_company), '\s+', ' ', 'g')) limit 1;
    end if;
    if v_co is null then
      insert into public.crm_companies (name, nip, kind) values (left(btrim(p_company), 200), v_nip, coalesce(p_company_kind, 'other')) returning id into v_co;
    else
      update public.crm_companies set nip = coalesce(nip, v_nip),
        kind = case when kind = 'other' and p_company_kind is not null then p_company_kind else kind end
      where id = v_co;
    end if;
  end if;

  if v_email is not null then select id into v_id from public.crm_contacts where lower(email) = v_email; end if;
  if v_id is null then
    insert into public.crm_contacts (email, name, phone, company_id, locale, tags, sources)
    values (v_email, left(coalesce(btrim(p_name), ''), 160), nullif(left(btrim(coalesce(p_phone, '')), 40), ''), v_co,
            case when p_locale = 'en' then 'en' else 'pl' end,
            case when p_tag is null then '{}' else array[p_tag] end,
            case when p_source is null then '{}' else array[p_source] end)
    returning id into v_id;
  else
    update public.crm_contacts set
      name = case when name = '' then left(coalesce(btrim(p_name), ''), 160) else name end,
      phone = coalesce(phone, nullif(left(btrim(coalesce(p_phone, '')), 40), '')),
      company_id = coalesce(company_id, v_co),
      tags = case when p_tag is null or p_tag = any(tags) then tags else tags || p_tag end,
      sources = case when p_source is null or p_source = any(sources) then sources else sources || p_source end,
      stage = case when stage = 'inactive' then 'new' else stage end
    where id = v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.crm_upsert_contact(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;

-- Zgłoszenie z formularza → osoba + firma + wpis na osi. Błąd CRM nigdy nie blokuje formularza.
create or replace function public.crm_from_lead() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
  v_tag text := case new.kind when 'exhibitor' then 'wystawca' when 'partner' then 'partner' when 'media' then 'media' else 'kontakt' end;
  v_kind text := case new.kind when 'exhibitor' then 'exhibitor' when 'partner' then 'partner' when 'media' then 'media' else null end;
begin
  begin
    v_id := public.crm_upsert_contact(new.email, new.name, new.phone, new.company, new.details->>'nip', new.locale, v_tag, 'form:' || new.kind, v_kind);
    new.contact_id := v_id;
    insert into public.crm_activities (contact_id, type, body, ref)
    values (v_id, 'lead', left(concat_ws(' · ', nullif(new.topic, ''), nullif(new.message, '')), 4000), new.id::text);
  exception when others then
    raise warning 'crm_from_lead: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists crm_from_lead on public.leads;
create trigger crm_from_lead before insert on public.leads for each row execute function public.crm_from_lead();

create or replace function public.crm_from_newsletter() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  begin
    if tg_op = 'INSERT' then
      v_id := public.crm_upsert_contact(new.email, null, null, null, null, new.locale, 'newsletter', 'newsletter');
      update public.crm_contacts set newsletter = true,
        newsletter_segments = case when new.segment = any(newsletter_segments) then newsletter_segments else newsletter_segments || new.segment end
      where id = v_id;
      insert into public.crm_activities (contact_id, type, body, ref) values (v_id, 'newsletter', 'subscribe:' || new.segment, new.id::text);
    else
      select id into v_id from public.crm_contacts where lower(email) = lower(old.email);
      if v_id is not null then
        update public.crm_contacts set newsletter_segments = array_remove(newsletter_segments, old.segment),
          newsletter = cardinality(array_remove(newsletter_segments, old.segment)) > 0,
          tags = case when cardinality(array_remove(newsletter_segments, old.segment)) > 0 then tags else array_remove(tags, 'newsletter') end
        where id = v_id;
        insert into public.crm_activities (contact_id, type, body) values (v_id, 'newsletter', 'unsubscribe:' || old.segment);
      end if;
    end if;
  exception when others then
    raise warning 'crm_from_newsletter: %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists crm_from_newsletter on public.newsletter_subscribers;
create trigger crm_from_newsletter after insert or delete on public.newsletter_subscribers for each row execute function public.crm_from_newsletter();

-- Dla przyszłego webhooka płatności (Edge Function, klucz service role): kupujący → CRM.
create or replace function public.crm_record_order(
  p_email text, p_name text, p_phone text, p_company text, p_nip text, p_total numeric, p_ref text, p_summary text, p_locale text default 'pl'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := public.crm_upsert_contact(p_email, p_name, p_phone, p_company, p_nip, p_locale, 'kupujacy', 'order');
  update public.crm_contacts set orders_count = orders_count + 1, orders_total = orders_total + coalesce(p_total, 0),
    stage = case when stage in ('new','contacted','interested','inactive') then 'client' else stage end
  where id = v_id;
  insert into public.crm_activities (contact_id, type, body, ref) values (v_id, 'order', left(p_summary, 4000), p_ref);
  return v_id;
end $$;
revoke all on function public.crm_record_order(text, text, text, text, text, numeric, text, text, text) from public, anon, authenticated;

-- Połączenie dwóch kart tej samej osoby (np. ten sam człowiek z dwoma adresami).
create or replace function public.crm_merge_contacts(p_keep uuid, p_drop uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.crm_contacts;
begin
  if public.my_role() not in ('admin','marketing','exhibitors') then raise exception 'forbidden' using errcode = '42501'; end if;
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
revoke all on function public.crm_merge_contacts(uuid, uuid) from public, anon;
grant execute on function public.crm_merge_contacts(uuid, uuid), public.crm_can_write() to authenticated;

-- Liczniki do menu i pulpitu (jedno małe zapytanie).
create or replace function public.crm_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.is_staff() then null else jsonb_build_object(
    'contacts', (select count(*) from public.crm_contacts),
    'companies', (select count(*) from public.crm_companies),
    'new7', (select count(*) from public.crm_contacts where created_at > now() - interval '7 days'),
    'overdue', (select count(*) from public.crm_activities where type = 'task' and done_at is null and due_at < date_trunc('day', now() at time zone 'Europe/Warsaw') at time zone 'Europe/Warsaw'),
    'today', (select count(*) from public.crm_activities where type = 'task' and done_at is null
              and due_at >= date_trunc('day', now() at time zone 'Europe/Warsaw') at time zone 'Europe/Warsaw'
              and due_at < (date_trunc('day', now() at time zone 'Europe/Warsaw') + interval '1 day') at time zone 'Europe/Warsaw'),
    'mineDue', (select count(*) from public.crm_activities where type = 'task' and done_at is null and assigned_to = auth.uid()
              and due_at < (date_trunc('day', now() at time zone 'Europe/Warsaw') + interval '1 day') at time zone 'Europe/Warsaw')
  ) end
$$;
revoke all on function public.crm_counts() from public, anon;
grant execute on function public.crm_counts() to authenticated;

-- Jednorazowo: istniejące zgłoszenia i zapisy trafiają do CRM.
do $$
declare r record; v uuid;
begin
  for r in select * from public.leads where contact_id is null order by created_at loop
    v := public.crm_upsert_contact(r.email, r.name, r.phone, r.company, r.details->>'nip', r.locale,
      case r.kind when 'exhibitor' then 'wystawca' when 'partner' then 'partner' when 'media' then 'media' else 'kontakt' end, 'form:' || r.kind,
      case r.kind when 'exhibitor' then 'exhibitor' when 'partner' then 'partner' when 'media' then 'media' else null end);
    update public.leads set contact_id = v where id = r.id;
    insert into public.crm_activities (contact_id, type, body, ref, created_at) values (v, 'lead', left(concat_ws(' · ', nullif(r.topic, ''), nullif(r.message, '')), 4000), r.id::text, r.created_at);
  end loop;
  for r in select * from public.newsletter_subscribers order by created_at loop
    v := public.crm_upsert_contact(r.email, null, null, null, null, r.locale, 'newsletter', 'newsletter');
    update public.crm_contacts set newsletter = true, newsletter_segments = case when r.segment = any(newsletter_segments) then newsletter_segments else newsletter_segments || r.segment end where id = v;
  end loop;
end $$;

notify pgrst, 'reload schema';
