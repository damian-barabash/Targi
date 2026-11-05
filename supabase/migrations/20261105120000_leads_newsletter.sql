-- Formularze strony: zgłoszenia (wystawcy, partnerzy, media, kontakt) i newsletter.
-- Anon może tylko dodawać wiersze; odczyt wyłącznie z panelu (service role / zalogowani admini — później).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('exhibitor','partner','media','contact')),
  locale text not null default 'pl' check (locale in ('pl','en')),
  name text not null check (char_length(name) between 2 and 160),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  company text check (char_length(company) <= 200),
  topic text check (char_length(topic) <= 80),
  message text check (char_length(message) <= 4000),
  details jsonb not null default '{}'::jsonb,
  consent_privacy boolean not null check (consent_privacy),
  status text not null default 'new' check (status in ('new','in_progress','won','lost','archived')),
  source_path text check (char_length(source_path) <= 300)
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  segment text not null check (segment in ('visitor','professional','exhibitor')),
  locale text not null default 'pl' check (locale in ('pl','en')),
  consent_marketing boolean not null check (consent_marketing),
  synced_at timestamptz,
  unique (email, segment)
);

alter table public.leads enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "anon insert leads" on public.leads;
create policy "anon insert leads" on public.leads
  for insert to anon, authenticated
  with check (status = 'new');

drop policy if exists "anon insert newsletter" on public.newsletter_subscribers;
create policy "anon insert newsletter" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (synced_at is null);

revoke all on public.leads, public.newsletter_subscribers from anon;
grant insert on public.leads, public.newsletter_subscribers to anon, authenticated;
