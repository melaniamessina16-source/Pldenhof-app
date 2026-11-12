# Oldenhof Producten – web app

Installable web app (PWA) for shop employees. Works offline after the first visit; notes and
out-of-stock flags are shared with the team through Supabase when online.

## Folders
- `docs/` – the app that GitHub Pages serves (static files only). `docs/sw.js` is generated.
- `data/` – catalog sources: `catalog_seed.json` (booklet guides), `*_pages.json` (parsed website pages),
  `curation.json` + `curation-coffee/*.json` (hand-written summaries per model), `catalog.json` (built).
- `tools/` – `parse_pages.py`, `build_catalog.py`, `build_web.py`, `sw.template.js`, `supabase-setup.sql`.

## Update the data
```
python3 -I tools/parse_pages.py data/coffee_pages.json <saved pages...>
python3 -I tools/build_catalog.py
python3 -I tools/build_web.py <folder with raw photos named <variant-id>.src>
```
New photos: download each variant's `imageURL` (kookwinkel.nl/media, not behind the bot check) to `<variant-id>.src`.

## Shared notes (Supabase, free plan)
1. Create a project, open SQL editor, paste `tools/supabase-setup.sql` with CHANGE-ME replaced by a team code.
2. Put the project URL and the public anon key in `docs/config.js` (teamCode stays empty).
3. Each phone enters the team code once under Instellingen. Without it the app still works, but only locally.

## Hosting
Any static host over HTTPS. GitHub Pages: branch `main`, folder `/docs`.
