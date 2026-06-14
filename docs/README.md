# visayasgrid — Documentation

Build documents and implementation journals for the Visayas transmission grid visualization project.

---

## Start here

**[architecture.md](architecture.md)** — Full project flow from raw NGCP data to the Leaflet frontend. Read this first to understand how the pieces connect.

---

## Implementation journals

Each document covers one improvement: **what** changed, **why** it was needed, and **how** it was implemented (with specific file paths, function names, and code snippets).

| Doc | Summary |
|---|---|
| [impl/V1-visualization-improvements.md](impl/V1-visualization-improvements.md) | Generator circles vs substation squares, line color toggle, hover tooltips, performance |
| [impl/P1-ac-loadflow-implemented.md](impl/P1-ac-loadflow-implemented.md) | AC Newton-Raphson load flow — transformer insertion, PV buses, voltage profile |
| [impl/P1-ac-loadflow-deferred.md](impl/P1-ac-loadflow-deferred.md) | Original deferral analysis (mixed-voltage network; transformer models needed) |
| [impl/P2-submarine-cables.md](impl/P2-submarine-cables.md) | Replaced estimated submarine cable impedances with IEC 60840 XLPE 630 mm² values |
| [impl/P4-hvdc-interchange.md](impl/P4-hvdc-interchange.md) | Surfaced the Leyte–Luzon HVDC interchange MW in the UI |
| [impl/P6-provenance-manifest.md](impl/P6-provenance-manifest.md) | Added `manifest.json` build metadata and flow-mode footer |
| [impl/P8-constants-module.md](impl/P8-constants-module.md) | Extracted all modeling constants to `scripts/constants.py` with source citations |

---

## Pipeline quick reference

```sh
# Step 1 — rebuild clean CSVs from raw NGCP source data
python scripts/process_temp.py

# Step 2a — run AC load flow → regenerate GeoJSON + manifest.json
python scripts/build_data.py

# Step 2b — run DC linear load flow → web/public/data/dc/
python scripts/build_data.py --mode dc

# Or both in sequence:
python scripts/process_temp.py && python scripts/build_data.py

# Frontend dev server
cd web && npm run dev
```

Outputs committed to the repo:
- `web/public/data/buses.geojson` (AC)
- `web/public/data/lines.geojson` (AC)
- `web/public/data/manifest.json` (AC)
- `web/public/data/dc/` — DC scenario (auto-built by GitHub Actions)

---

## Live site

https://visayasgrid.vercel.app
