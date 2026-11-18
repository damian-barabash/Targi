# Beauty & Hair Expo — strona

Strona targów **Beauty & Hair Expo Rzeszów 2028** (19–20.02.2028, ZEN.COM Expo). PL + EN.

**Stack:** React 19 + Vite 7 + `vite-react-ssg` (każda podstrona to gotowy plik HTML — szybko i dobrze dla SEO) · własny CSS · Supabase (formularze, później panel, bilety, płatności) · GitHub Pages.

## Komendy

```bash
npm install
npm run dev       # podgląd na żywo
npm run build     # dist/ + sitemap.xml, robots.txt, 404.html
npm run preview
npm run images    # assets/photos/*.jpg -> public/img/*.webp (800 i 1600 px)
```

`.env` (nie trafia do repo, wzór w `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Struktura

- `src/content/site.ts` — wszystkie treści robocze (bilety, strefy, program, eksperci, wystawcy, partnerzy, wpisy). Kształt danych = przyszłe tabele w bazie.
- `src/i18n.ts` — adresy podstron w każdym języku i teksty interfejsu. Nowy język = nowa kolumna.
- `src/routes.tsx` — lista tras (bez parametrów, żeby każda strona była wygenerowana).
- `src/components/` — layout, sekcje, formularze. `src/pages/` — podstrony.
- `supabase/migrations/` — schemat bazy (`leads`, `newsletter_subscribers`, RLS: anon tylko dodaje).
- Zdjęcia: Unsplash (robocze), lista w `assets/photos/SOURCES.txt`.

## Wdrożenie

Push na `main` → GitHub Actions buduje i publikuje na Pages (Settings → Pages → Source: GitHub Actions).
Dla własnej domeny ustaw zmienne repo `BASE_PATH=/` i `SITE_URL=https://…` oraz dodaj `public/CNAME`.

## Panel administracyjny (`/admin/`)

Panel w stylu WordPressa z edytorem wizualnym stron. Działa na tej samej domenie, jako osobno ładowany fragment aplikacji (nie obciąża strony publicznej).

- **Wejście:** `https://beauty.barabashflow.pl/admin/` — e-mail + hasło. Konta zakłada administrator w „Użytkownicy” (rejestracja jest wyłączona).
- **Wersja robocza → publikacja:** zmiany zapisują się w tabeli `content` (Supabase). „Opublikuj” tworzy migawkę (`snapshots`) i uruchamia workflow `deploy.yml`; build pobiera migawkę (`tools/fetch-content.mjs` → `src/content/published.json`) i generuje statyczną stronę. Strona publiczna **nie czyta bazy**.
- **Treści domyślne:** `src/content/default.ts` (zasiew bazy i wersja awaryjna, gdy build nie ma połączenia).
- **Bloki stron:** komponenty w `src/blocks/blocks.tsx`, opisy pól do panelu w `src/admin/schema.ts`. Nowy blok = komponent + wpis w `BLOCKS` + wpis w `BLOCK_DEFS`.
- **Zdjęcia z biblioteki mediów** trafiają do magazynu Supabase, a przy buildzie są kopiowane do `public/m/` (strona serwuje je z GitHub Pages).
- **Statystyki:** `track_visit` / `track_ads` zapisują tylko sumy dzienne (bez cookies).
- **Role:** admin, wystawcy, bilety, marketing, raporty — pilnowane w bazie (`can_edit_key`, RLS).

Baza i funkcje:

```bash
./tools/sb.sh sql supabase/migrations/20261118100000_admin_panel.sql   # schemat (wymaga .secrets z SUPABASE_PAT i SUPABASE_REF)
node tools/seed.mjs > seed.sql && ./tools/sb.sh sql seed.sql           # treści początkowe (nie nadpisuje istniejących)
```

Funkcje Edge (`supabase/functions`): `publish` (migawka + start buildu), `users` (konta), `translate` (PL → EN).
Sekrety funkcji: `GH_DISPATCH_TOKEN`, `GH_REPO`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (opcjonalnie `AI_FORMAT=anthropic`).

Lokalnie: `npm run dev` → `http://localhost:5173/admin/`. `CONTENT_DEFAULT=1 npm run build` buduje z treści domyślnych, bez pobierania migawki.
