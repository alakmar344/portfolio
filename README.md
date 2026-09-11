# ALAKMAR — a museum of work and experiments

A static Breeze-powered portfolio. One calm, readable page:
entrance, gallery, Breeze exhibit, laboratory, archive, library,
about and exit. No React, Vue, Next or Svelte — the UI is `app.breeze`,
state and keyed lists are Breeze. No 3D, no animation, no effects.

## Run it

```bash
# from this folder — any static server works (fetch needs http, not file://)
node ../breeze-src/breeze-cli.js serve . 8099
# or: npx serve . / python3 -m http.server
```

## Test it

```bash
node --test test/museum.test.js   # 21 museum tests
node --test ../breeze-src/test/breeze.test.js  # 22 framework tests
```

## Structure

- `app.breeze` — rooms, keyed exhibits, filters, dossier, footer (source of UI)
- `museum-data.js` — projects, books, benchmarks, profile (source of data)
- `museum.js` — Breeze methods, walk camera, dossier morph, archive, a11y
- `museum.css` — vintage-modern system on top of `breeze.css`
- `breeze.js` / `breeze.css` — Breeze runtime (vendored, do not hand-edit)
