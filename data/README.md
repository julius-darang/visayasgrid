# Data Pipeline

Single source pipeline:

```
data/temp/buses.csv        ─┐
data/temp/lines.csv         │
data/temp/generators.csv    ├─► scripts/process_temp.py ─► data/buses.csv
data/temp/loads.csv         │                              data/lines.csv
data/load_estimates.csv     ─┘                             data/generators.csv
                                                              │
                                                              ▼
                                                    scripts/build_data.py
                                                              │
                                                              ▼
                                                web/public/data/*.geojson
```

## Inputs (`data/temp/`)

NGCP-coded transmission dataset (PyPSA-style format). All buses use the v1
NGCP code scheme (`04ORMOC`, `05MAGDUGO`, etc.) where the prefix is the
region. Visayas region prefixes: `04` (Eastern Visayas — Leyte/Samar),
`05` (Cebu), `06` (Negros), `07` (Bohol), `08` (Panay/Guimaras).

| File | Rows | Purpose |
|---|---|---|
| `temp/buses.csv` | 192 (52 Visayas) | Bus coordinates, nominal voltage |
| `temp/lines.csv` | 236 (57 Visayas) | Branch impedances (r, x ohm), capacity (s_nom MVA), parallel circuit count |
| `temp/generators.csv` | 425 (115 Visayas) | Per-unit generators with carrier + p_nom |
| `temp/loads.csv` | 571 (140 Visayas) | Per-feeder load attachments (count-based) |

## Overlay (`data/load_estimates.csv`)

Hand-tuned MW estimates for specific buses, applied **only as gap-fill** for
buses without feeder entries in `temp/loads.csv`. Edit this file to override
loads on specific buses.

## `process_temp.py`

- Filters everything to Visayas region.
- Maps NGCP codes → readable names (`04ORMOC` → `Ormoc`).
- Merges `04STARITATAP` into `04STARITA` (same physical facility).
- Submarine cables hardcoded by bus-pair (avoids false-positive on the
  San Juanico bridge crossing).
- Loads: each feeder attachment = `LOAD_MW_PER_FEEDER` MW (default 12;
  calibrated to ~2 GW Visayas peak). q_mvar derived from 0.96 PF.
- Generators: per-carrier `DISPATCH_FACTOR` applied to installed `p_nom`
  to estimate operating output. Per-bus aggregate + primary carrier.

## `build_data.py`

- Builds pandapower 60 Hz network.
- Drops unsupplied buses from the load flow run (keeps them in GeoJSON).
- Runs DC load flow (tolerant of multi-voltage substations).
- Slack at Ormoc absorbs/exports surplus (matches HVDC behavior).
- Emits GeoJSON for the frontend.

## Output schemas

### `data/buses.csv`
| Column | Notes |
|---|---|
| `name` | Readable substation name |
| `x`, `y` | Longitude, latitude |
| `v_nom` | Nominal voltage (kV) |
| `voltages_kv` | All voltages, comma-separated |
| `island` | Cebu / Leyte / Samar / Negros / Panay / Bohol / Biliran / Guimaras |
| `bus_type` | `substation` / `generator` / `bess` / `hvdc` |
| `p_mw`, `q_mvar` | Load (MW, MVAR) |
| `is_slack` | True for the one slack bus (Ormoc) |
| `load_count` | Number of feeder attachments from `temp/loads.csv` |
| `gen_capacity_mw` | Sum of installed `p_nom` at this bus |
| `gen_mw` | Sum of dispatched generation at this bus |
| `gen_carriers` | Comma-separated set of carriers |
| `primary_carrier` | Carrier with the most installed capacity at this bus |

### `data/lines.csv`
| Column | Notes |
|---|---|
| `line_id` | `L_<from>_<to>_<v>` |
| `from_bus`, `to_bus` | Reference `buses.csv:name` |
| `voltage_kv` | Line operating voltage (derived from line name) |
| `length_km` | Haversine distance between endpoints |
| `r_ohm_per_km`, `x_ohm_per_km` | `r_total / length_km`, `x_total / length_km` |
| `max_i_ka` | `s_nom_mva / (√3 × v_line)` per circuit |
| `is_submarine`, `cable_type` | Hardcoded by known submarine pairs |
| `parallel` | Number of parallel circuits (from `cables` column) |

### `data/generators.csv`
Per-unit list for reference (115 units), with substation, p_nom_mw,
carrier, build_year, and dispatched MW.

## Re-running the pipeline

```sh
.venv/bin/python scripts/process_temp.py
.venv/bin/python scripts/build_data.py
```

Or chain them:
```sh
.venv/bin/python scripts/process_temp.py && .venv/bin/python scripts/build_data.py
```
