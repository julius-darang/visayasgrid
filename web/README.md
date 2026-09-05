# Web frontend

React 19 + Vite 8 + Leaflet / react-leaflet, styled with Tailwind CSS. Fetches committed grid snapshots; it never runs power flow in the browser.

## Local development

Use Node 22.12+ or another version satisfying Vite's engine range (`^20.19.0 || >=22.12.0`). From this directory:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

The build writes `dist/`, including `public/data/` copied to `dist/data/`. No Python installation is needed for frontend-only work. [Full rebuild and deployment instructions](../docs/development.md).

## Free basemap setup

With no configuration, the app uses **OpenStreetMap Standard tiles**, without an API key or subscription. Both UI themes use that same light basemap. Grid markers and panels still follow the selected theme.

To retain the original CARTO light/dark basemaps:

1. Request your own key from [CARTO](https://carto.com/basemaps/apikey/).
2. Copy `.env.example` to `.env.local` and set `VITE_CARTO_API_KEY`.
3. Restart Vite. For deployment, set the same variable in the Vercel project environment and redeploy.

CARTO's key page, checked 2026-09-05, advertises a free allowance of 5 million tile requests per calendar month, intended for non-commercial use. It requires visible CARTO and OSM attribution. Review the linked terms when obtaining a key. No account registration, key request or paid service is performed by this application.

`VITE_` variables are embedded into browser assets. Use a basemap browser key here, never a private CARTO platform credential. Do not commit `.env.local`. Removing the variable and rebuilding returns to OSM; an invalid configured key does not trigger automatic provider failover.

OSM's public tile service is best-effort, with limited capacity. Keep attribution visible, allow normal browser referrers and caching, and do not add tile scraping or offline prefetch. See the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). Basemap access requires an internet connection even though the grid data is static.

## Runtime data and state

`useGridData` fetches `buses.geojson`, `lines.geojson` and `manifest.json` from `/data/` for peak, or `/data/{mean,offpeak,dc}/`. Optional scenarios appear after a successful manifest HEAD probe. These are root-relative URLs, so deployment beneath a URL subdirectory needs code changes.

The URL hash currently carries island filters, voltage filters and a selected feature. It does **not** carry scenario, zoom or theme. Personal display preferences use localStorage. See [known limitations](../docs/assessment.md) before extending these behaviors.

| Source | Responsibility |
|---|---|
| `src/App.jsx` | Own state, scenario discovery, selection, filters and panel composition |
| `src/hooks/useGridData.js` | Fetch datasets, retry, filter features |
| `src/components/MapView.jsx` | Leaflet layers, symbols, selection highlights, recentering |
| `src/components/Sidebar.jsx` | Filters, scenario selector, search and preferences |
| `src/components/InfoPanel.jsx` | Selected bus/line details |
| `src/components/StatsPanel.jsx` | Visible-feature totals and alerts; build metadata |
| `src/components/DataTable.jsx` | Sort and inspect visible features |
| `src/components/Legend.jsx` | Color reference and voltage toggles |
| `src/components/AboutModal.jsx` | In-app explanation; some historical copy needs reconciliation |
| `src/lib/styles.js` | Shared styling functions and palettes |
| `src/lib/grid.js` | Alert selectors and feature focus coordinates |
| `src/lib/viewState.js` | Encode/decode shareable filter and selection state |
| `src/lib/basemap.js` | Key-free default and optional CARTO provider configuration |

Tests under `src/` run in Vitest's Node environment. They cover helpers, not rendered interactions or live tile-provider availability.
