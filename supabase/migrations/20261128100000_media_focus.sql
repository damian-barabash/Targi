-- Asystent zdjęć: punkt kadru (twarz), rodzaj pliku (zdjęcie / logo) i wynik analizy.
-- Mapa { id: [x%, y%, szerokość/wysokość] } trafia do published_site jako "media" —
-- strona ustawia object-position i optyczną wielkość logotypów bez czytania bazy.

alter table public.media add column if not exists focus_x real;
alter table public.media add column if not exists focus_y real;
alter table public.media add column if not exists kind text not null default 'photo';
alter table public.media add column if not exists ai jsonb;
alter table public.media add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table public.media add constraint media_kind_check check (kind in ('photo', 'logo'));
exception when duplicate_object then null; end $$;

create or replace function public.media_meta() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(id::text, jsonb_build_array(
    round(coalesce(focus_x, 50)::numeric, 1),
    round(coalesce(focus_y, 50)::numeric, 1),
    round((width::numeric / greatest(height, 1)), 3),
    kind
  )), '{}'::jsonb)
  from public.media
$$;
grant execute on function public.media_meta() to authenticated;

create or replace function public.published_site() returns jsonb
language sql stable security definer set search_path = public as $$
  select data || jsonb_build_object('publishedAt', created_at, 'snapshotId', id, 'media', public.media_meta())
  from public.snapshots order by id desc limit 1
$$;
grant execute on function public.published_site() to anon, authenticated;

notify pgrst, 'reload schema';
