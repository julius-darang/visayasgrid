# Visayas Power Grid Visualization — Simple Prototype Plan

## Context

The v2 plan ([power-grid-viz-plan-v2.md](power-grid-viz-plan-v2.md)) is 10–11 weeks of work: OSM extraction, synthetic distribution generation, PostGIS, FastAPI, Docker on Oracle Cloud. Too heavy for a prototype.

This plan keeps the **vision** (visualize and model the Visayas transmission grid using public NGCP data) but strips everything that doesn't serve it at the prototype stage. Target: a working public URL in ~2 weeks with the simplest possible stack.

The decision is also driven by deploy targets — **Vercel only**, no backend, no DB. Data is small (~50 buses, ~80 lines), static, and changes infrequently, so it can be pre-computed into JSON files and served from Vercel's CDN.

## Scope

**In:**
- Visayas transmission only (69 / 138 / 230 / 350 kV HVDC)
- Real, publicly-available NGCP data (user will author the CSVs)
- pandapower load flow — one snapshot
- Topology validation gate before `runpp`
- Submarine cable handling (Leyte–Cebu, Cebu–Negros, Negros–Panay, Cebu–Bohol)
- Leaflet map with voltage + loading color encoding
- Click-to-inspect bus/line panel
- Island and voltage filters
- Vercel deploy

**Out (dropped from v2):**
- Distribution lines / synthetic topology generator (Phase 1C in v2)
- OSM extraction pipeline (Phase 1A/1B in v2)
- PostGIS + PostgreSQL → static JSON files instead
- FastAPI backend → not needed
- Docker / Oracle Cloud / Nginx → Vercel handles it
- Three load flow scenarios → one snapshot for now
- PNG / PDF export
- Auth
- Multiple Jupyter notebooks → one Python script

## Architecture

```
data/buses.csv + data/lines.csv
            │
            ▼
   scripts/build_data.py    ← one-off Python: pandapower load flow
            │
            ▼
web/public/data/*.geojson   ← committed to repo
            │
            ▼
  React + Leaflet (web/)    ← reads JSON via fetch()
            │
            ▼
        Vercel              ← public URL, free tier
```

No backend, no database, no auth, no Docker. Re-running load flow = `python scripts/build_data.py && git push`.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Data prep | Python 3.11 + pandas + pandapower | One-off script. Same engine as v2, minus OSMnx/GeoPandas. |
| Topology gate | `pandapower.topology` | Catches isolated buses before `runpp`. Non-negotiable. |
| Frontend | Vite + React 18 | Fast cold start, native Vercel support, simple. |
| Map | Leaflet + react-leaflet | Free OSM tiles, <200 elements = no perf concern. |
| Styling | Tailwind CSS | Already in v2 stack. |
| Data storage | Static JSON in `web/public/data/` | <50 KB total. CDN-cached by Vercel. |
| Hosting | Vercel | Free tier, GitHub auto-deploy. |
| Version control | Git + GitHub | Required for Vercel auto-deploy. |

Explicitly **not** using: Supabase, Render, FastAPI, PostGIS, Docker, OSMnx, GeoPandas, contextily, ReportLab, Deck.gl.

## Folder Decision

**Reuse `/Users/julius/polymath/Projects/visayasgrid`.** Archive the v2 plan into a subfolder rather than delete it — useful reference if scope ever expands.

## Project Structure

```
visayasgrid/
├── archive/
│   └── power-grid-viz-plan-v2.md      # moved from root
├── data/
│   ├── buses.csv                       # exists (53 entries)
│   ├── lines.csv                       # user will provide
│   └── README.md                       # CSV schema docs
├── scripts/
│   ├── build_data.py                   # CSV → load flow → GeoJSON
│   └── requirements.txt                # pandapower, pandas
├── web/                                # Vercel root
│   ├── public/
│   │   └── data/
│   │       ├── buses.geojson           # generated
│   │       └── lines.geojson           # generated
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── MapView.jsx             # Leaflet canvas
│   │   │   ├── Sidebar.jsx             # filters
│   │   │   ├── InfoPanel.jsx           # click-to-inspect
│   │   │   └── Legend.jsx              # voltage + loading legend
│   │   ├── hooks/
│   │   │   └── useGridData.js          # fetch + filter
│   │   └── lib/
│   │       └── styles.js               # color maps
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── .gitignore
└── README.md
```

## Data Schemas

### `data/buses.csv` (already exists)
Current columns are sufficient: `name, x, y, v_nom, region, description, island, bus_type`.

Add (either in CSV or assigned in `build_data.py`):
- `p_mw, q_mvar` — load at the bus (0 for pure interconnection nodes; rough estimates for major load centers like Cebu City, Bacolod, Iloilo)
- `is_slack` — `TRUE` for exactly one bus. **Recommendation:** `04ORMOC` (HVDC injection point, naturally acts as the system reference)

### `data/lines.csv` (user will author)
Minimum required columns:
```
line_id, from_bus, to_bus, length_km,
r_ohm_per_km, x_ohm_per_km, max_i_ka,
is_submarine, cable_type
```
- `from_bus` / `to_bus` reference the `name` column in `buses.csv`
- For **submarine** sections (Leyte–Cebu, Cebu–Negros, Negros–Panay, Cebu–Bohol): `r=0.0754, x=0.121, max_i_ka=0.645` (630 mm² XLPE defaults from v2)
- For **overhead** lines: use ACSR table values per voltage level
- Voltage is derived from the buses, no need to duplicate

### Output: `web/public/data/buses.geojson`
FeatureCollection of `Point` geometries. Properties = all CSV fields + `vm_pu`, `va_degree` from load flow.

### Output: `web/public/data/lines.geojson`
FeatureCollection of `LineString` geometries (just `[from.xy, to.xy]` — straight lines are fine for the prototype). Properties = all CSV fields + `loading_percent`, `p_from_mw`, `i_from_ka`.

## Color Encoding

Voltage (kept from v1/v2):
- 350 kV HVDC → `#7209b7` (NEW, not in v2)
- 230 kV → `#e63946`
- 138 kV → `#f4a261`
- 69 kV → `#2a9d8f`

Line loading:
- < 50% → `#2d6a4f` (green)
- 50–80% → `#f4a261` (yellow)
- 80–100% → `#e63946` (red)
- > 100% → `#9b2226` (dark red, overloaded)

Submarine cables: dashed stroke (`dashArray: "6 4"`), regardless of loading color.

## Phases (~2 weeks, solo)

### Phase 0 — Cleanup & init (Day 1)
- `mkdir archive && mv power-grid-viz-plan-v2.md archive/`
- `git init`, write `.gitignore` (node_modules, __pycache__, .env, .DS_Store)
- Create folder skeleton: `data/`, `scripts/`, `web/`
- Create empty GitHub repo, push initial commit

### Phase 1 — Data prep (Days 2–4)
- Confirm/finalize `data/buses.csv` (already there — may need P/Q + slack flag)
- Author `data/lines.csv` from public NGCP transmission map / OpenGridMap references
- Write `scripts/build_data.py`:
  1. Load both CSVs into DataFrames
  2. Build pandapower network with `f_hz=60`
  3. Create buses with `vn_kv = v_nom`
  4. Create `ext_grid` at the bus where `is_slack == TRUE`
  5. Create lines with `pp.create_line_from_parameters`
  6. Create loads for buses with non-zero `p_mw`
  7. **Topology gate:** `top.unsupplied_buses(net)` — if non-empty, print and exit non-zero
  8. `pp.runpp(net, algorithm="nr", calculate_voltage_angles=True)`
  9. Merge `net.res_bus` and `net.res_line` into bus/line records
  10. Write `buses.geojson` and `lines.geojson` to `web/public/data/`
- Decide initial loads: simplest is fixed P/Q per substation bus (~50 MW / 15 MVAR) and known capacities at generator buses

### Phase 2 — Frontend scaffold (Days 5–7)
- `cd web && npm create vite@latest . -- --template react`
- `npm install leaflet react-leaflet tailwindcss postcss autoprefixer`
- Set up Tailwind (`tailwind.config.js`, base CSS)
- `MapView.jsx`: Leaflet `MapContainer` centered on `[10.7, 123.5]`, zoom 8, OSM tile layer
- `useGridData.js`: `useEffect` fetches both GeoJSON files, returns `{ buses, lines, loading, error }`
- Render buses as `CircleMarker` (radius by voltage), lines as `Polyline`

### Phase 3 — Visual encoding + interactions (Days 8–10)
- `lib/styles.js`: pure functions `colorForVoltage(kv)`, `colorForLoading(pct)`, `strokeForLine(line)`
- Wire styles into MapView
- `InfoPanel.jsx`: state lives in App, shown when a feature is clicked; lists all properties
- `Sidebar.jsx`: island filter (Cebu / Leyte / Samar / Negros / Panay / Bohol / Guimaras as checkboxes), voltage filter
- `Legend.jsx`: absolutely-positioned bottom-left card with voltage colors + loading scale

### Phase 4 — Deploy (Days 11–12)
- Push to GitHub
- Create Vercel project → import repo
- Root directory: `web`; build command: `npm run build`; output: `dist`
- Verify production URL works on desktop + mobile

### Phase 5 — Buffer (Days 13–14)
- Polish, bug fixes, write `README.md` with screenshots

## Critical Files To Create

| Path | Purpose |
|---|---|
| `archive/power-grid-viz-plan-v2.md` | Move of existing root plan |
| `data/lines.csv` | User-authored transmission line data |
| `data/README.md` | CSV schema documentation |
| `scripts/build_data.py` | pandapower → GeoJSON pipeline |
| `scripts/requirements.txt` | `pandapower`, `pandas` |
| `web/src/App.jsx` | Top-level layout |
| `web/src/components/MapView.jsx` | Leaflet canvas |
| `web/src/components/Sidebar.jsx` | Filters |
| `web/src/components/InfoPanel.jsx` | Click-inspect |
| `web/src/components/Legend.jsx` | Color legend |
| `web/src/hooks/useGridData.js` | Data fetch + filter |
| `web/src/lib/styles.js` | Voltage + loading color maps |
| `web/public/data/buses.geojson` | Generated by `build_data.py` |
| `web/public/data/lines.geojson` | Generated by `build_data.py` |
| `.gitignore` | node_modules, __pycache__, .env, dist |
| `README.md` | How to build data + run frontend + deploy |

## Verification (End-to-End)

After Phase 4 the following must all pass:
1. `cd scripts && python build_data.py` — exits 0, prints "Load flow converged", produces non-empty `buses.geojson` and `lines.geojson` in `web/public/data/`
2. `cd web && npm run dev` — http://localhost:5173 shows Visayas region with buses (colored circles) and lines (colored polylines) rendered on the OSM basemap
3. Click any bus → InfoPanel shows name, voltage, vm_pu, location
4. Click any line → InfoPanel shows from/to buses, length_km, loading_percent, is_submarine
5. Submarine lines render with dashed stroke
6. Filter to only "Cebu" island → only Cebu buses/lines visible; rest hidden
7. Uncheck "230 kV" → 230 kV lines and buses hidden
8. Production Vercel URL loads on desktop and mobile, renders identically

## Decisions Locked

- **Static JSON, no Supabase, no Render.** Confirmed by user.
- **One load flow snapshot.** Adding a second scenario later = one extra JSON file + a `<select>` element.
- **Reuse `visayasgrid` folder, archive v2 plan.** Confirmed.
- **Vercel only.** No second platform.
- **No git repo exists today** — Phase 0 creates it.

## Upgrade Path (out of scope now, easy later)

- Distribution layer → add `data/distribution_lines.csv` + new layer toggle. Architecture supports it.
- Multiple scenarios → emit `load_flow_morning.geojson`, etc.; add scenario selector.
- Real-time / editable data → move CSVs to Supabase tables, replace `fetch` with `supabase-js`. Same property names, no other changes.
- PNG / PDF export → add a `scripts/export_map.py` using matplotlib + contextily (v2 has the code).
