# Project Architecture

## What this project is

**visayasgrid** is a static-site visualization of the Visayas transmission grid (Philippines). It takes authoritative NGCP substation and line data, runs a DC power flow study using pandapower, and serves the results as pre-computed GeoJSON files to a React/Leaflet frontend hosted on Vercel.

The core design decision is **no backend at runtime**. All computation happens offline during the build step; the frontend only ever fetches static JSON files.

---

## Full data flow

```
data/temp/              ← NGCP-coded source dataset (authoritative)
  buses.csv               192 rows (all Philippines); 52 Visayas
  lines.csv               236 rows; 57 Visayas
  generators.csv          425 rows; 115 Visayas
  loads.csv               571 rows; 140 Visayas feeders

data/load_estimates.csv ← hand-tuned gap-fill loads (46 buses)

scripts/constants.py    ← all modeling constants with citations

         │
         ▼  python scripts/process_temp.py
         │
data/
  buses.csv             ← 52 Visayas buses (clean, readable names)
  lines.csv             ← 57 Visayas lines (+ c_nf_per_km column)
  generators.csv        ← 115 generator units with dispatch_mw

         │
         ▼  python scripts/build_data.py
         │
web/public/data/
  buses.geojson         ← Point FeatureCollection (bus results)
  lines.geojson         ← LineString FeatureCollection (line results)
  manifest.json         ← build metadata (timestamp, totals, HVDC MW)

         │
         ▼  npm run dev / Vercel deploy
         │
React + Leaflet frontend
  App.jsx               ← layout, filter state
  MapView.jsx           ← Leaflet map, bus/line rendering
  Sidebar.jsx           ← island + voltage filters
  InfoPanel.jsx         ← click-to-inspect panel
  StatsPanel.jsx        ← demand/generation summary
  Legend.jsx            ← voltage + loading colour scale
  hooks/useGridData.js  ← fetches all three JSON files
  lib/styles.js         ← pure colour/radius functions
```

---

## Step 1 — `process_temp.py`: raw → clean CSVs

**Input:** `data/temp/*.csv` (NGCP v1 code format)  
**Output:** `data/buses.csv`, `data/lines.csv`, `data/generators.csv`

Key transformations performed in order:

1. **Region filter** — keeps only buses whose NGCP code prefix is in `{04, 05, 06, 07, 08}` (the five Visayas regions).
2. **Code merging** — `MERGE_CODES` collapses duplicate physical facilities to a single canonical bus (currently one alias: `04STARITATAP → 04STARITA`).
3. **Readable naming** — `CODE_INFO` maps each NGCP code to a human name, island, and bus type (`substation`, `generator`, `bess`, `hvdc`).
4. **Slack assignment** — the bus named `"Ormoc"` is flagged `is_slack=True`; it represents the AC termination of the Leyte–Luzon HVDC link.
5. **Load assignment** — each feeder attachment in `temp/loads.csv` is treated as `LOAD_MW_PER_FEEDER = 12 MW`. Reactive power is `Q = P × LOAD_PF_QP_RATIO = 0.30` (0.96 PF). Buses with no feeder entries are gap-filled from `data/load_estimates.csv`.
6. **Generator dispatch** — each generator unit's operating MW is estimated as `p_nom × DISPATCH_FACTOR[carrier]`. Units at the same bus are summed to `gen_mw` and `gen_capacity_mw`.
7. **Line processing** — pairs with both endpoints in Visayas are kept; voltage is parsed from the NGCP line name prefix; haversine distance is computed as a length proxy; impedance is normalised to per-km.
8. **Submarine cable override** — bus-pairs in `SUBMARINE_PAIRS` get XLPE 630 mm² parameters (`r=0.0754`, `x=0.121 Ω/km`, `c=200 nF/km`, `max_i=0.645 kA`) instead of the NGCP values divided by haversine distance.
9. **Parallel circuit merging** — if multiple NGCP records connect the same bus-pair at the same voltage, their circuit counts are summed into a single `parallel` entry.
10. **Orphan detection** — buses with no transmission lines are printed as warnings (kept in output for map display).

---

## Step 2 — `build_data.py`: CSVs → load flow → GeoJSON

**Input:** `data/buses.csv`, `data/lines.csv`  
**Output:** `web/public/data/buses.geojson`, `web/public/data/lines.geojson`, `web/public/data/manifest.json`

### Network construction

A pandapower network is built at 60 Hz:

- **Buses** — created with `vn_kv = v_nom` and geodata. Each bus gets a pandapower index stored in `bus_idx[name]`.
- **Slack** — the `is_slack` bus becomes an `ext_grid` (external grid / infinite bus) at `vm_pu = 1.0`. The slack absorbs or injects whatever MW is needed to balance the system, analogous to how the HVDC link compensates Visayas imbalance.
- **Loads** — buses with `p_mw > 0` or `q_mvar > 0` get a `load` element.
- **Generators** — buses with `gen_mw > 0` get a static generator (`sgen`) with `q_mvar = 0` (constant P injection, no reactive support).
- **Lines** — created with per-km r, x, c parameters and `parallel` count. pandapower automatically scales impedance for parallel circuits.

### Topology check

`pandapower.topology.unsupplied_buses(net)` identifies buses not reachable from the slack. These are excluded from the load flow run but kept in GeoJSON (shown as `connected: false`).

### DC load flow

`pp.rundcpp(net_run)` is used — a linearised power flow that:
- Solves **active power** (MW) flows on each branch
- Computes **voltage angles** (degrees) at each bus
- Leaves **voltage magnitudes** fixed at 1.0 pu (DC approximation)
- Is robust to mixed nominal voltages (no per-unit normalisation issues)

> **Why DC, not AC?** The network connects buses at 350 kV (Ormoc HVDC), 230 kV, 138 kV, and 69 kV via direct line elements — no transformer models exist. Newton-Raphson AC load flow requires consistent voltage bases across directly-connected elements; without transformers, per-unit computations produce wrong results at cross-voltage connections. See `docs/impl/P1-ac-loadflow-deferred.md` for the full analysis.

After convergence, results (`loading_percent`, `p_from_mw`, `i_from_ka`, `vm_pu`, `va_degree`) are copied from `net_run` back to `net` using name-based matching so unsupplied buses retain null results.

### HVDC interchange capture

After DC flow, `net_run.res_ext_grid["p_mw"].iloc[0]` gives the total MW injected by the Ormoc slack:
- **Positive** → Luzon importing to Visayas (Visayas demand > local generation)
- **Negative** → Visayas exporting to Luzon (Visayas generation > local demand)

This value is stored as `hvdc_import_mw` on the Ormoc bus feature and in `manifest.json`.

### GeoJSON emission

- **buses.geojson** — each bus becomes a `Point` feature. All CSV columns are passed through as properties (with NaN → null cleaning), plus `connected`, `vm_pu`, `va_degree`, and `hvdc_import_mw` (for the Ormoc bus only).
- **lines.geojson** — each line becomes a two-point `LineString` using bus endpoint coordinates. All CSV columns plus `loading_percent`, `p_from_mw`, `i_from_ka`.
- **manifest.json** — lightweight metadata: generation timestamp, power flow mode, bus/line counts, total load/gen MW, HVDC interchange MW.

---

## Step 3 — React frontend

### Data loading (`useGridData.js`)

On mount, three parallel `fetch()` calls retrieve `buses.geojson`, `lines.geojson`, and `manifest.json`. A `cancelled` flag prevents React state updates if the component unmounts before the promises resolve. Errors in any fetch propagate to an `error` state displayed as a banner.

### Filtering (`filterFeatures` in `useGridData.js`)

`App.jsx` maintains `selectedIslands` and `selectedVoltages` state. On change, `filterFeatures(fc, { islands, voltages })` returns a new FeatureCollection:
- Features whose `island` property is **not** in the selected set are removed.
- Features whose voltage (`v_nom ?? voltage_kv`) is **not** in the selected set are removed.
- A feature with a missing `island` property passes the island filter (shown regardless of selection).
- A feature with `v = 0` or non-numeric voltage passes the voltage filter.

Both filters are ANDed.

### Map rendering (`MapView.jsx`)

- **Lines** — rendered as `Polyline` elements coloured by `colorForLoading(loading_percent)`. Submarine lines render with a dashed stroke (set by `lineStyle()` in `styles.js`). Lines with `|p_from_mw| ≥ 30 MW` display a `▶` flow arrow at the midpoint, oriented by bearing.
- **Buses** — rendered as `CircleMarker` elements. Radius scales logarithmically with `gen_capacity_mw`. Fill colour is voltage-level based. Generator buses get a carrier-coloured outer ring. The HVDC bus (Ormoc) additionally gets a dashed violet outer ring.

### Colour encoding (`styles.js`)

| Layer | Attribute | Scheme |
|---|---|---|
| Bus fill | Nominal voltage | 350 kV → violet, 230 kV → red, 138 kV → amber, 69 kV → teal |
| Generator ring | Primary carrier | Coal dark, Geothermal green, Solar yellow, Wind cyan, Hydro blue, … |
| Line stroke | Loading percent | <50% → green, 50–80% → amber, 80–100% → red, >100% → dark red |
| Line dash | Submarine | dashed if `is_submarine` |

---

## Re-running the pipeline

```sh
# Step 1 — rebuild CSVs from raw NGCP data
python scripts/process_temp.py

# Step 2 — run load flow, regenerate GeoJSON + manifest
python scripts/build_data.py

# Or chain both:
python scripts/process_temp.py && python scripts/build_data.py
```

After running, commit `data/*.csv` and `web/public/data/*.geojson` and `web/public/data/manifest.json`, then push. Vercel redeploys automatically on push to `main`.

---

## Key files reference

| Path | Role |
|---|---|
| `scripts/constants.py` | All modeling constants with source citations |
| `scripts/process_temp.py` | Raw NGCP → clean CSVs |
| `scripts/build_data.py` | CSVs → pandapower network → GeoJSON + manifest |
| `data/temp/` | NGCP-coded source data (do not edit) |
| `data/load_estimates.csv` | Hand-tuned gap-fill loads (edit to adjust) |
| `data/buses.csv` | Processed bus data (generated) |
| `data/lines.csv` | Processed line data with XLPE overrides (generated) |
| `web/public/data/buses.geojson` | Load flow results — buses (generated) |
| `web/public/data/lines.geojson` | Load flow results — lines (generated) |
| `web/public/data/manifest.json` | Build metadata (generated) |
| `web/src/lib/styles.js` | Pure colour/radius functions |
| `web/src/hooks/useGridData.js` | Data fetch + filter logic |
| `web/src/components/MapView.jsx` | Leaflet map renderer |
| `web/src/components/StatsPanel.jsx` | Demand/generation summary card |
| `web/src/components/InfoPanel.jsx` | Click-to-inspect side panel |
