# visayasgrid — Documentation

Build documents and implementation journals for the Visayas transmission grid visualization project.

---

## Start here

1. [Project README](../README.md) — purpose, quick start and boundaries.
2. [Architecture](architecture.md) — implemented data and UI flow.
3. [Development guide](development.md) — setup, rebuild, verification and deployment.
4. [Data guide](../data/README.md) — input ownership, schemas and scenario interpretation.
5. [Repository assessment](assessment.md) — legibility rating, evidence and remaining issues.

Current status lives in [STATUS.md](../STATUS.md); planned improvements remain in [PLAN.md](../PLAN.md). The [public project story](https://juliusdarang.com/proj/visayasgrid.html) explains motivation for a general reader.

The journals below are historical implementation records, not setup instructions or a guarantee of current behavior. In particular, P1's deferral was superseded by its implemented journal, and constants/scenario behavior evolved further afterward.

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

## Working on the project

Use the [development guide](development.md) to choose a frontend-only build, full CSV preparation, snapshot-only preparation or a scenario rebuild. A default build updates peak only. Rebuild the other scenario directories explicitly when relevant.
