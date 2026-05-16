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
| [impl/P8-constants-module.md](impl/P8-constants-module.md) | Extracted all modeling constants to `scripts/constants.py` with source citations |
| [impl/P2-submarine-cables.md](impl/P2-submarine-cables.md) | Replaced estimated submarine cable impedances with IEC 60840 XLPE 630 mm² values |
| [impl/P4-hvdc-interchange.md](impl/P4-hvdc-interchange.md) | Surfaced the Leyte–Luzon HVDC interchange MW in the UI |
| [impl/P6-provenance-manifest.md](impl/P6-provenance-manifest.md) | Added `manifest.json` build metadata and "DC flow · date" footer |
| [impl/P1-ac-loadflow-deferred.md](impl/P1-ac-loadflow-deferred.md) | Why AC load flow was not implemented (mixed-voltage network; transformer models needed) |

---

## Pipeline quick reference

```sh
# Rebuild clean CSVs from raw NGCP source data
python scripts/process_temp.py

# Run DC load flow → regenerate GeoJSON + manifest.json
python scripts/build_data.py

# Or both in sequence:
python scripts/process_temp.py && python scripts/build_data.py

# Frontend dev server
cd web && npm run dev
```

Outputs committed to the repo (Vercel reads them as static assets):
- `web/public/data/buses.geojson`
- `web/public/data/lines.geojson`
- `web/public/data/manifest.json`
