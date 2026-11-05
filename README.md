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
