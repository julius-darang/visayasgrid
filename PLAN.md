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

**Reuse this directory (`engineering/visayasgrid/`).** Archive the v2 plan into a subfolder rather than delete it — useful reference if scope ever expands.

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

## Completed Phases (0–6)

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

### Phase 4 — Deploy (Days 11–12) — DONE (2026-05-24)
- Push to GitHub — done (`julius-darang/visayasgrid`)
- Create Vercel project → import repo — done
- Root directory: `web`; build command: `npm run build`; output: `dist` — done
- Verify production URL works on desktop + mobile — done
- **Shipped:** live on Vercel as of 2026-05-24. Production URL: **https://visayasgrid.vercel.app**
  - Source-verified dataset confirmed live 2026-06-03: production deploy of commit `e3a65ad`
    (2026-06-02 22:18 PHT) serves manifest 54 buses / 60 lines / 7 submarine; CBIP
    `L_Argao_Maribojoc_230` present; Bacolod at corrected coord [122.989, 10.629]. Phase 6
    "Shipped" criterion met.

### Phase 5 — Buffer (Days 13–14)
- Polish, bug fixes, write `README.md` with screenshots

### Phase 6 — Data: synthetic-derived → source-verified (DONE, 2026-06-14)

The prototype shipped (Phase 4 live on Vercel, 2026-05-24). The remaining weakness is **data provenance**, so this is the active focus.

**Audit finding.** The `data/temp/` set is not bespoke — it is a Visayas slice of **PyPSA-PH v1.0** (Arizeo C. Salac, DESTEC, University of Pisa): 192 buses / 236 lines / 425 generators, NGCP code scheme (`04ORMOC`, `05CEBU`, `06BACOLOD`, `08ILOILO1`…), demand benchmarked to 2023. Good academic provenance, but it is a **secondary** source, and the per-bus loads are hand-tuned (`LOAD_MW_PER_FEEDER`, default 12 MW/feeder).

**Goal.** Replace/validate the Visayas subset against **primary sources** and document where every value comes from.

**Sources (cite, never fabricate a URL):**
- NGCP Transmission Development Plan 2023–2040 — Visayas chapters (substation list, voltage levels, the Cebu–Negros–Panay 230 kV backbone, the four submarine interconnections: Leyte–Cebu, Cebu–Negros, Negros–Panay, Cebu–Bohol). TDP 2023–2040 Consultation Report: https://ngcp.ph/Attachment-Uploads/TDP%202023-2040%20Consultation%20Report-2023-06-15-07-54-06.pdf — TDP 2022–2040 Report: https://ngcp.ph/Attachment-Uploads/Transmission%20Development%20Plan%202022-2040%20Report-2023-01-04-10-49-08.pdf
- PyPSA-PH v1.0 (the current base, for traceability) — https://github.com/arizeosalac/PyPSA-PH — archived: https://zenodo.org/records/15586573
- OpenStreetMap / OpenInfraMap (coordinates, line routing, substation footprints) — https://wiki.openstreetmap.org/wiki/Power_networks/Philippines — https://openinframap.org/

**Sourceable vs. estimated — be honest in the data:**
- *Sourceable from primary refs:* substation existence + names, voltage levels, bus coordinates, line connectivity/topology, line lengths, submarine vs. overhead, published circuit capacity / ratings, generator plants + capacities.
- *Remains an engineering estimate (must be flagged):* per-line `r_ohm_per_km` / `x_ohm_per_km` — NGCP does not publish per-line impedances, so keep standard ACSR / 630 mm² XLPE conductor-table values per voltage level, marked as estimates; per-bus loads from the hand-tuned overlay until real demand splits are sourced.

**Deliverable (this week's one shippable goal):** updated `data/buses.csv` + `data/lines.csv` reconciled against the above, plus a new **`data/SOURCES.md`** recording provenance per field (`sourced` | `pypsa-ph` | `standard-table estimate`) with a real citation for each sourced value. Then re-run `process_temp.py && build_data.py`, confirm the topology gate passes, and redeploy.

**Status: DONE 2026-06-14.** 51/52 buses sourced; 1 deferred (Bantap, bus #43 — coord plausible but facility unconfirmed without NGCP one-line diagrams). SOURCES.md changelog documents all work. AC load flow live on Vercel with manifest, multi-scenario demand snapshots, and DOE Dec-2024 generation reconciliation.

---

## Upcoming Phases (7–9) — planned Jun 2026

The dataset is source-verified at the main transmission level (138/230 kV backbone + submarine
interconnections + major generators). The remaining gap is **coverage completeness**: the 69 kV
sub-transmission network has many load-end substations not yet included, and not all DOE-listed
generators are wired into the model. Phases 7–9 fill those gaps systematically, returning to the
same Phase 6 methodology (source-first, never fabricate, document provenance).

**Sources for all three phases (cite, never fabricate a URL):**
- NGCP TDP 2023–2040 Consultation Report: https://ngcp.ph/Attachment-Uploads/TDP%202023-2040%20Consultation%20Report-2023-06-15-07-54-06.pdf
- NGCP TDP 2022–2040 Report: https://ngcp.ph/Attachment-Uploads/Transmission%20Development%20Plan%202022-2040%20Report-2023-01-04-10-49-08.pdf
- DOE "List of Existing Power Plants for Visayas Grid as of December 2024" (already used in Phase 6)
- OSM / OpenInfraMap: https://wiki.openstreetmap.org/wiki/Power_networks/Philippines · https://openinframap.org/
- ERC case documents (plant registration, switchyard approvals)
- Local knowledge (user's own familiarity with Visayas substations)

### Phase 7 — 69 kV sub-transmission layer (week 1)

**Goal:** Complete the 69 kV network. Currently only 5 69 kV lines exist (Sta. Barbara↔Bantap,
Bantap↔Buenavista, Ubay↔Tapal, Calatrava↔San Carlos, plus the isolated Bantap 69 kV bus).
Many real-world 69 kV load-end substations and their connecting lines are missing from PyPSA-PH's
Visayas slice.

**Approach — systematic sweep:**
1. **Audit** — Map all known 69 kV substations per island from NGCP TDP one-line diagrams, OSM
   power substation layer, and OpenInfraMap
2. **Source** — For each missing substation: name, coordinates (OSM/OpenInfraMap), connecting
   higher-voltage bus, line length (haversine), load estimate (MW from feeder count or proxy)
3. **Add buses** — Insert new rows in `data/temp/buses.csv` with NGCP-style code; `process_temp.py`
   picks them up automatically
4. **Add lines** — Add corresponding 69 kV lines in `data/temp/` or via `data/lines.csv` overrides
5. **Impedances** — Use standard 69 kV ACSR conductor-table values (estimate, flagged in SOURCES.md)
6. **Load estimates** — Assign initial P/Q for new distribution substations (default 5–15 MW per
   feeder, documented in SOURCES.md)
7. **Verify** — Re-run `process_temp.py && build_data.py`, confirm topology gate passes, AC load
   flow converges, HVDC balance remains realistic
8. **Provenance** — Update `data/SOURCES.md` with all new entries

**Existing 69 kV buses that stay:** Bantap (deferred re-search from Phase 6).

**Deliverable:** Expanded dataset with all identifiable 69 kV sub-transmission substations and
their connecting lines. Pipeline verified, deployed, live on Vercel.

---

### Phase 8 — Missing generators (week 2)

**Goal:** Match DOE Dec-2024 plant list completely. Current `data/generators.csv` has 115 units;
the DOE list for Visayas has more. Every plant on the DOE list should either be wired into the
model or explicitly documented as excluded (with reason).

**Approach:**
1. **Cross-reference** — Systematic comparison of DOE Dec-2024 Visayas plant list vs current
   `generators.csv`. Identify missing plants by island, fuel type, and capacity
2. **Connection bus** — For each missing plant: determine which substation bus it connects to
   (NGCP TDP one-line, ERC filings, OSM plant footprints, local knowledge)
3. **Add generators** — Insert new rows in `data/temp/generators.csv` with type, capacity,
   dispatch (default to capacity factor from `constants.py` per carrier)
4. **New generator buses** — If a plant connects at a location that is not yet a bus in the
   model, add a new bus (substation or generator type) following Phase 7 methodology
5. **New 69 kV lines** — If a generator connects via a dedicated 69 kV spur line not yet in
   the dataset, add it (counts toward Phase 7 completeness as well)
6. **PV bus assignment** — Large generators (≥100 MW dispatched) become PV buses per existing
   `build_data.py` logic; smaller ones remain PQ injections
7. **Verify** — Re-run pipeline, confirm load flow convergence, check:
   - Total dispatched generation remains plausible (~2,200 MW peak)
   - HVDC interchange stays within ±200 MW physical range
   - No voltage violations beyond existing ±5% outliers
8. **Provenance** — Update `data/SOURCES.md` with generator source citations

**Edge cases:**
- Decommissioned plants on DOE list: verify status, exclude with note
- Plants under construction: include if committed with `status=construction`
- Co-located plants at same bus: aggregate or model as separate units (consistent with
  existing generator.csv schema of one row per unit)

**Deliverable:** Full generator coverage matching DOE Dec-2024 Visayas list. Pipeline verified,
deployed, live on Vercel.

---

### Phase 9 — Network reconciliation & validation (weeks 3–4)

**Goal:** Close the loop. After adding 69 kV substations (Phase 7) and generators (Phase 8),
the network has grown beyond the original 54-bus, 60-line dataset. Phase 9 is a comprehensive
audit to ensure everything is consistent, source-verified, and production-ready.

**Approach:**
1. **Topology audit**
   - No orphan buses (every bus connected to at least one line)
   - No duplicate lines (verify parallel circuits are correctly modeled)
   - All cross-voltage connections have transformer intermediates (verify
     `build_data.py` inserted them correctly)
   - Verify line connectivity against NGCP TDP and OSM route maps
2. **Impedance review**
   - All new 69 kV lines use standard conductor-table values (r=0.15–0.22 Ω/km,
     x=0.40–0.45 Ω/km per ACSR typical)
   - Flag any anomalous inherited values (following fix #4 methodology from Phase 6)
3. **Coordinate source sweep**
   - Apply Phase 6 methodology to all new buses: verify against OSM/OpenInfraMap
   - Tag each as `sourced` or `pypsa-ph (estimate)` in SOURCES.md
   - Resolve Bantap if NGCP TDP one-line data becomes available
4. **Generator connectivity audit**
   - Verify each generator's `bus` field references a real bus in `buses.csv`
   - Verify total dispatched generation by island matches DOE aggregates within ±10%
   - Flag any generator with implausibly high/low capacity factor
5. **Full pipeline** — `process_temp.py && build_data.py` in both AC and DC modes
   - Topology gate passes (zero unsupplied buses)
   - AC Newton-Raphson converges
   - DC fallback also converges (for comparison dataset)
   - Manifest correctly reports element counts
6. **SOURCES.md** — Final provenance pass for all elements added in Phases 7–8
7. **Deploy** — Commit data + GeoJSON, push, verify production URL renders correctly on
   desktop and mobile

**Verification gate (must all pass):**
| Check | Criterion |
|-------|-----------|
| Topology | `unsupplied_buses(net)` is empty |
| AC load flow | `runpp` converges, prints "AC load flow converged" |
| DC fallback | `rundcpp` converges (for CI comparison dataset) |
| Manifest | element counts match CSV row counts |
| Vercel | production URL loads, renders all elements |
| SOURCES.md | all new entries have source tag + citation |

**Deliverable:** Fully reconciled, source-verified dataset covering the complete Visayas
transmission network (all voltage layers) with full generator coverage. Phase 6 methodology
applied end-to-end. Production-ready.

## Critical Files Created

| Path | Purpose |
|---|---|
| `archive/power-grid-viz-plan-v2.md` | Move of existing root plan |
| `data/lines.csv` | User-authored transmission line data |
| `data/README.md` | CSV schema documentation |
| `data/SOURCES.md` | Per-field provenance + citations (Phase 6) |
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
- **No git repo exists today** — Phase 0 creates it. _(Done — repo `julius-darang/visayasgrid` live, deployed to Vercel 2026-05-24.)_
- **Data base is PyPSA-PH v1.0 (Salac), filtered to Visayas.** Upgrading to source-verified per Phase 6; keep PyPSA-PH attribution in `SOURCES.md`.

## Upgrade Path (out of scope now, easy later)

- Distribution layer → add `data/distribution_lines.csv` + new layer toggle. Architecture supports it.
- Multiple scenarios → emit `load_flow_morning.geojson`, etc.; add scenario selector.
- Real-time / editable data → move CSVs to Supabase tables, replace `fetch` with `supabase-js`. Same property names, no other changes.
- PNG / PDF export → add a `scripts/export_map.py` using matplotlib + contextily (v2 has the code).
