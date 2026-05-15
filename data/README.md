# Data Pipeline

Two-stage pipeline:

```
raw/substations_authoritative.csv  ─┐
raw/buses.csv  (OSM extract)        ├─► scripts/process_raw.py  ─►  buses.csv + lines.csv
raw/lines.csv  (OSM extract)        ─┘                              │
                                                                    ▼
                                                          scripts/build_data.py
                                                                    │
                                                                    ▼
                                                  web/public/data/*.geojson
```

## `raw/` — inputs

- **`substations_authoritative.csv`** — 90 named substations across Visayas, sourced from NGCP TDP 2016–2040 reports and regional transmission maps. Coordinates cross-referenced with utility site records. Ground truth.
- **`buses.csv`** — OSM-extracted buses (substations + towers + distribution nodes). Noisy. ~2960 rows.
- **`lines.csv`** — OSM-extracted line segments. ~2972 rows, mostly distribution (13.8 kV) which is filtered out downstream.
- **`visayas_power_raw.geojson`** — raw OSM dump (29 MB). Kept for reference; not consumed by the pipeline.

## `process_raw.py` — reconciliation

Produces:
- **`buses.csv`** — one row per authoritative substation (90 rows).
- **`lines.csv`** — substation-to-substation logical interconnects derived from OSM by collapsing tower-only paths between matched substations.

Matching strategy:
1. Normalized name match (stripping `substation`, `LES`, parentheticals, etc.).
2. `v1_code` match (legacy NGCP code → user name).
3. Proximity match within `MATCH_RADIUS_KM` (12 km).

Filtering:
- Drop synthetic OSM lines.
- Drop lines with `voltage_kv < 60`.
- Reject collapsed paths longer than `MAX_PATH_LENGTH_KM` (350 km).

## `build_data.py` — load flow + GeoJSON

- Builds a pandapower network (60 Hz).
- Identifies buses not reachable from the slack — keeps them in the GeoJSON for display but excludes them from the load flow.
- If `p_mw` is nonzero anywhere, runs `pp.runpp` on the connected portion. Otherwise skips the load flow and emits buses/lines without result fields.

## Output schemas

### `buses.csv`

| Column | Type | Notes |
|---|---|---|
| `name` | string | Authoritative substation name |
| `x` | float | Longitude |
| `y` | float | Latitude |
| `v_nom` | int | Highest voltage at the bus, kV |
| `voltages_kv` | string | All voltage levels, comma-separated (e.g. `"138,230"`) |
| `island` | string | `Cebu`, `Leyte`, `Samar`, `Negros`, `Panay`, `Bohol`, `Biliran`, `Guimaras` |
| `bus_type` | string | `substation` or `generator` |
| `p_mw` | float | Active load (MW). Default 0. Fill in for load flow. |
| `q_mvar` | float | Reactive load (MVAR). Default 0. |
| `is_slack` | bool | `True` for exactly one bus. Default: Ormoc. |

### `lines.csv`

| Column | Type | Notes |
|---|---|---|
| `line_id` | string | `L_<from>_<to>` |
| `from_bus` | string | References `buses.csv:name` |
| `to_bus` | string | References `buses.csv:name` |
| `voltage_kv` | int | Bucketed: 230 / 138 / 69 |
| `length_km` | float | Sum of OSM segment lengths along the path |
| `r_ohm_per_km` | float | Default by voltage / cable type |
| `x_ohm_per_km` | float | Default by voltage / cable type |
| `max_i_ka` | float | Default by voltage / cable type |
| `is_submarine` | bool | True if any segment in the collapsed path is submarine |
| `cable_type` | string | `overhead` or `submarine_xlpe` |

### Impedance defaults

| Class | r (Ω/km) | x (Ω/km) | max_i (kA) |
|---|---|---|---|
| 230 kV overhead | 0.06 | 0.40 | 0.95 |
| 138 kV overhead | 0.12 | 0.40 | 0.65 |
| 69 kV overhead | 0.30 | 0.40 | 0.40 |
| Submarine XLPE 630 mm² | 0.0754 | 0.121 | 0.645 |

## Known gaps

OSM coverage of the Visayas transmission grid is incomplete. After processing:
- **30 of 90 substations** have at least one derived line (the major 138/230 kV backbone, HVDC, and submarine interconnects).
- **60 of 90 substations** are orphaned — primarily 69 kV LES (load-end substations) that OSM doesn't tag, plus parts of the Panay backbone and some Bohol/Cebu peripherals.

These show on the map but are excluded from the load flow. To fix, either:
1. Manually append rows to `lines.csv` (preserves the pipeline shape).
2. Source line data from NGCP TDP appendices or DU diagrams.
