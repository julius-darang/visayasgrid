# Architecture

This guide describes the implemented repository. Start with the [root README](../README.md); use [development.md](development.md) for commands and [data/README.md](../data/README.md) for field definitions. The existing [implementation journals](README.md#implementation-journals) explain earlier decisions, but can contain superseded details.

## System boundary

VisayasGrid has two execution environments:

- **Offline Python:** pandas prepares CSVs; pandapower builds a network and solves a snapshot; the exporter writes GeoJSON and a manifest.
- **Browser:** React fetches those files and owns view state; Leaflet draws the grid over externally hosted basemap tiles.

Vercel serves the frontend and committed results. There is no API server, database, browser-side solver, live dispatch feed or authenticated user account.

```text
data/temp/{buses,lines,generators,loads}.csv
 + data/load_estimates.csv + scripts/constants.py
             │ process_temp.py: main()
             ▼
data/{buses,lines,generators}.csv
             │
             ├─ loads_t.csv → build_demand_snapshots() → load_scenarios.csv
             └─ generator units + scenario factors → build_gen_scenarios()
                                                     → gen_scenarios.csv
             │
             ▼ build_data.py: main()
  scenario overrides → build_network() → topology reachability
             → connected-network solve → emit_geojson()
             │
             ▼ web/public/data/{root,mean,offpeak,dc}/
  buses.geojson + lines.geojson + manifest.json
             │
             ▼ useGridData → App → filtered map / stats / table
                                 → selected-feature inspection
```

`root` above means `/data/`, not a literal `root/` subdirectory. Prepared CSVs and generated web outputs are committed. Source data is small enough to render as individual Leaflet features.

## Preparation: `scripts/process_temp.py`

The script resolves paths relative to itself. `main()` reads the national NGCP-coded input, selects the Visayas code prefixes, applies `DROP_CODES` and `MERGE_CODES`, and uses `CODE_INFO` for readable names, islands and bus types. Coordinates and voltages come from the input CSV, including corrections already mirrored there.

Ormoc is the slack. Base demand is feeder count × `LOAD_MW_PER_FEEDER`; reactive demand uses `LOAD_PF_QP_RATIO`. `load_estimates.csv` fills only buses without feeder records. Generator dispatch uses carrier-specific `DISPATCH_FACTOR`; unit records are retained in `generators.csv` and aggregated into bus properties.

Line processing resolves endpoints, derives voltage, calculates haversine length, converts inherited total impedance to per-km values, applies submarine and selected overhead parameter overrides, and aggregates parallel circuits for each endpoint pair/voltage. Orphans are reported but retained.

After preparation, `build_demand_snapshots()` reads `loads_t.csv`, aligns columns to current bus names, and creates coincident system peak/minimum plus per-bus annual mean demand. A bus without a time-series column gets zero scenario demand. `build_gen_scenarios()` applies `SCENARIO_GEN_FACTORS` to unit capacities and sums by bus. `--only-snapshots` runs those last two functions without rebuilding the clean network.

If the time-series file is absent, demand snapshot generation is skipped; an existing scenario CSV is not deleted. Check which files were actually regenerated.

## Build: `scripts/build_data.py`

`load_inputs()` reads clean buses and lines. `main()` selects output location and, for AC mode only, overlays matching rows from the demand and generation scenario CSVs. Missing scenario files leave base values in place; unmatched bus names also retain their base values.

| Invocation | Inputs beyond clean network | Output |
|---|---|---|
| Default / `--scenario peak` | Peak demand and dispatch columns when present | `web/public/data/` |
| `--scenario mean` | Mean columns | `web/public/data/mean/` |
| `--scenario offpeak` | Off-peak columns | `web/public/data/offpeak/` |
| `--mode dc` | No scenario overlays | `web/public/data/dc/` |

`--mode dc --scenario mean` still uses base values and writes `dc/`; it does not create a DC mean scenario.

### Network construction

`build_network()` creates a 60 Hz pandapower network. Each clean bus gets a network bus, loads and aggregated generation; the first `is_slack` bus gets an `ext_grid` at 1.0 pu.

AC construction adjusts an `hvdc` bus to its 230 kV AC-side base. For unequal endpoint voltages it inserts an intermediate bus at the lower voltage and a transformer at the higher-voltage end. Intermediate buses are shared by high-side bus and lower voltage. These simulation-only buses/transformers are not exported as extra map features.

Transformers use assumed impedance/rating defaults with zero core losses. Bus generation of at least 100 MW becomes a PV `gen` at 1.02 pu; smaller injection is `sgen` at zero MVAr. Q limits are supplied to `create_gen`, but the current `runpp` call does not explicitly enable Q-limit enforcement. Missing overhead capacitance is filled by voltage class.

Explicit DC construction keeps original bus voltage labels, inserts no transformers and represents generation as `sgen`. This differs from a DC fallback on an AC-constructed network.

Most preparation assumptions are in `scripts/constants.py`. `TRAFO_DEFAULTS`, `OVERHEAD_C_NF` and `PV_GEN_THRESHOLD_MW` remain in `build_data.py`; constants are not fully centralized.

### Topology and solve

`unsupplied_buses()` identifies nodes unreachable from the slack. The solver works on a copy with those nodes removed. They remain in the output with `connected: false`; this is reachability handling, not a comprehensive network validation gate.

When total active load is positive, `_run_flow()` attempts AC Newton–Raphson with a DC initialization and 50 iterations. Any exception triggers a DC attempt on that same network. An explicit DC build calls `rundcpp` directly. No load, or failure of both solvers, leaves mode `none` and missing result fields. A successful process exit alone does not establish convergence.

The external-grid active power becomes `hvdc_import_mw`: positive means injection into the modeled Visayas network, negative means withdrawal. It is an interchange proxy. Exceeding the assumed 440 MW link rating prints a warning; no constraint redispatches generation or caps the result.

### Export

`emit_geojson()` passes through input row properties and adds results. Bus geometry uses `[longitude, latitude]`; line geometry is a straight two-endpoint segment. Results are copied back by bus name / line ID after the connected network solve. Exported bus `v_nom` remains the CSV label even when AC construction used a different voltage base.

The manifest records actual solver mode, requested demand scenario (null for explicit DC), build time, counts, total input load/generation and modeled interchange. Totals include input buses even if disconnected; interchange comes from the solved component. See [the data contract](../data/README.md#frontend-data-contract) for units and missing values.

## Frontend flow

`main.jsx` mounts `App`. `App` owns filters, selected feature, scenario, focus target and panels. The default scenario is peak; HEAD probes discover optional mean/off-peak/DC manifests.

`useGridData` fetches three scenario files concurrently. A cancellation flag ignores obsolete responses on effect cleanup. Retry changes a nonce to rerun the effect. Currently non-OK HTTP responses become empty collections/null rather than errors; network and JSON-decoding failures reach the error banner. Scenario changes also do not reset all loading/error/selection state. These are tracked in [assessment.md](assessment.md), not promised as supported recovery behavior.

`filterFeatures()` independently filters buses and lines by `island` and nominal voltage (`v_nom` or `voltage_kv`). Missing island/zero or nonnumeric voltage passes that filter. The current line table has no island property, so all lines survive island-only filtering. This is a property filter, not a topological subnetwork extraction; a line can remain visible when its endpoint marker is filtered out.

`MapView` renders polylines, generator circles, substation/HVDC squares, optional rings, labels and arrows. It memoizes layer inputs/handlers and caches SVG icons. Selecting a bus highlights directly adjacent lines/buses, not a recursive connected component. Flow arrows use the sign of `p_from_mw` and a 30 MW magnitude threshold.

`Sidebar` controls filters/preferences and searches all buses. `StatsPanel` summarizes visible features and focuses the highest alert. `DataTable` sorts visible features. `InfoPanel` reads the selected feature object. `Legend` shares style helpers with the map. `AboutModal` supplies explanatory copy.

`lib/basemap.js` selects key-free OSM Standard by default, or CARTO light/dark with `VITE_CARTO_API_KEY`. The OSM fallback stays light in either UI theme. Configuration and provider terms are documented in [web setup](../web/README.md).

## State persistence

The hash encodes islands, voltages and selection; scenario, map position and theme are not encoded. Selection is initially resolved after data loads, then `history.replaceState` maintains the URL. A line selection is identified by endpoints rather than `line_id`. Empty filter sets currently decode back to all filters after reload.

`usePersistentState` catches localStorage read/write errors for display preferences. `useTheme` and first-use hint storage currently do not apply the same protection.

## Automation and change boundaries

The DC GitHub Action uses committed clean CSVs and updates only `dc/`. AC snapshots are generated separately. Frontend builds copy static assets; they do not regenerate the model. See [development.md](development.md#deployment).

For new UI behavior, start with `App` and the relevant component/helper. For model changes, start with the source ledger and the preparation/build boundary. Read `PLAN.md` Phases 7–9 before expanding coverage; this documentation pass does not implement those phases.
