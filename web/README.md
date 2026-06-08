# visayasgrid — Web Frontend

React + Vite app that renders the pre-built GeoJSON power flow results on an interactive Leaflet map.

## Dev

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Data

The app fetches static files from `public/data/` at runtime. Rebuild them by running the Python pipeline from the repo root:

```sh
python scripts/process_temp.py && python scripts/build_data.py
```

See [`../docs/architecture.md`](../docs/architecture.md) for the full data flow.

## Key source files

| File | Role |
|---|---|
| `src/App.jsx` | Layout, filter state, scenario selector |
| `src/components/MapView.jsx` | Leaflet map — bus/line rendering, icon caches |
| `src/components/Sidebar.jsx` | Island/voltage filters, display toggles, bus search |
| `src/components/InfoPanel.jsx` | Click-to-inspect details panel |
| `src/components/StatsPanel.jsx` | Demand/generation headline numbers |
| `src/components/Legend.jsx` | Colour scale reference |
| `src/lib/styles.js` | Pure colour/radius/style functions |
| `src/hooks/useGridData.js` | GeoJSON fetch + filter logic |
