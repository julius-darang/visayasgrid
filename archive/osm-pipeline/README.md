# Archived: OSM-based pipeline

This folder contains the original pipeline that derived the Visayas grid from
OpenStreetMap data, replaced in commit `94311b3` by the NGCP-coded `temp/`
dataset which has accurate coordinates and electrical parameters.

The OSM pipeline collapsed tower-only paths in OSM into substation-to-substation
logical lines, matched OSM substations to a hand-curated 90-substation list,
and supplemented with manual entries for the parts of the backbone OSM missed.

Kept here for reference. Nothing imports or runs from this folder.

## Files

| File | Original location | Purpose |
|---|---|---|
| `process_raw.py` | `scripts/` | The OSM reconciliation processor |
| `buses_osm.csv` | `data/raw/buses.csv` | 2,960 OSM-extracted buses (substations, towers, distribution) |
| `lines_osm.csv` | `data/raw/lines.csv` | 2,972 OSM-extracted line segments |
| `visayas_power_raw.geojson` | `data/raw/` | 28 MB raw OSM dump (gitignored) |
| `substations_authoritative.csv` | `data/raw/` | 90-substation hand-curated list from NGCP TDP reports |
| `manual_lines_supplement.csv` | `data/raw/` | Backbone lines OSM missed (Panay, parts of Negros, LES connections) |
| `exclude_lines.csv` | `data/raw/` | OSM-derived lines to drop (zigzag artifacts) |
