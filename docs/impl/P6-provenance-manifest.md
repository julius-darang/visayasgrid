# P6 — Provenance & Build Manifest

**Files changed:** `scripts/build_data.py`, `web/src/hooks/useGridData.js`, `web/src/App.jsx`, `web/src/components/StatsPanel.jsx`  
**Type:** Feature — new output file + frontend display

---

## What

Every pipeline run now emits `web/public/data/manifest.json` alongside the GeoJSON files. The manifest captures:

```json
{
  "generated_at": "2026-05-15T23:55:15Z",
  "power_flow_mode": "DC",
  "n_buses": 52,
  "n_lines": 57,
  "n_submarine_lines": 5,
  "total_load_mw": 1735.0,
  "total_gen_mw": 2210.9,
  "hvdc_import_mw": -475.9,
  "hvdc_capacity_mw": 440
}
```

The frontend fetches this file in parallel with the GeoJSON and uses it to show a "DC flow · \<date\>" footer at the bottom of the StatsPanel card.

---

## Why

### Traceability

A public visualization that makes quantitative claims about a real power grid needs to be dated. Without a timestamp, a viewer has no way to know whether they're looking at 2024 data or 2019 data. The `generated_at` field (UTC ISO-8601) answers this immediately.

### Debugging

`power_flow_mode` distinguishes a successful DC run from a "no loads / topology-only" emit. `n_buses`, `n_lines`, `total_load_mw`, `total_gen_mw` give a quick sanity check that the pipeline produced the expected network — if `n_buses` drops from 52 to 40, something went wrong upstream in `process_temp.py`.

### Single source of truth for summary stats

`StatsPanel.jsx` computes `totalLoad` and `totalGen` by summing the GeoJSON features currently shown on screen — which changes when the island/voltage filters are applied. Before the manifest, there was no way to see the system-wide totals independent of what the user has filtered. The manifest contains the pre-filter totals from the pipeline, which are the genuine network-wide figures.

### Future extensibility

When multiple scenarios are added (morning/evening/dry-season), each scenario's output directory will have its own `manifest.json`. The frontend can read the active scenario's manifest to show "Peak demand snapshot · Morning · 2026-05-15" instead of just a date.

---

## How

### `scripts/build_data.py` — `emit_geojson` function

The manifest is written at the end of `emit_geojson`, after both GeoJSON files:

```python
from datetime import datetime, timezone

manifest = {
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "power_flow_mode": power_flow_mode,   # "DC" or "none"
    "n_buses": len(bus_features),
    "n_lines": len(line_features),
    "n_submarine_lines": submarine_count,
    "total_load_mw": round(float(buses_df["p_mw"].sum()), 1),
    "total_gen_mw":  round(float(buses_df["gen_mw"].sum()), 1),
    "hvdc_import_mw": round(hvdc_import_mw, 1) if hvdc_import_mw is not None else None,
    "hvdc_capacity_mw": HVDC_CAPACITY_MW,
}
(OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
```

`power_flow_mode` is passed in from `main()`:

```python
emit_geojson(
    ...,
    power_flow_mode="DC" if has_results else "none",
)
```

`"none"` means the load flow was skipped (e.g., because all `p_mw == 0`), so the GeoJSON contains only topology without flow results.

#### Why `datetime.now(timezone.utc)` and not `datetime.utcnow()`?

`datetime.utcnow()` returns a naive datetime with no timezone info attached, which is deprecated in Python 3.12+. `datetime.now(timezone.utc)` returns a timezone-aware UTC datetime, which is the correct modern approach.

#### Why `strftime("%Y-%m-%dT%H:%M:%SZ")` instead of `.isoformat()`?

`.isoformat()` with a `timezone.utc`-aware datetime produces `"2026-05-15T23:55:15+00:00"`, which is valid but the `+00:00` suffix is less compact than the `Z` form. The `Z` form (`"2026-05-15T23:55:15Z"`) is unambiguously UTC and parsed correctly by JavaScript's `new Date()` constructor without any timezone library.

### `web/src/hooks/useGridData.js`

```js
const [manifest, setManifest] = useState(null);

// In the Promise.all:
fetch("/data/manifest.json").then((r) => (r.ok ? r.json() : null)),

// In the .then handler:
setManifest(m);

// In the return:
return { buses, lines, manifest, loading, error };
```

If `manifest.json` doesn't exist (e.g., on a fresh checkout before the pipeline has run), `r.ok` will be false and `manifest` stays `null`. All downstream consumers guard against `null`.

### `web/src/App.jsx`

```js
const { buses, lines, manifest, loading, error } = useGridData();
// ...
<StatsPanel buses={visibleBuses} manifest={manifest} />
```

`manifest` is passed to `StatsPanel` only. Other components don't need it.

### `web/src/components/StatsPanel.jsx` — date footer

A helper converts the ISO string to a human-readable date:

```js
function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return null;
  }
}

const snapshotDate = formatDate(manifest?.generated_at);
```

`"en-PH"` (Philippine English locale) produces dates like "May 15, 2026" — appropriate for the target audience. The `try/catch` guards against malformed date strings without crashing.

The footer renders below the "By island" details:

```jsx
{snapshotDate && (
  <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10px]
                  text-slate-400 dark:border-slate-800 dark:text-slate-600">
    DC flow · {snapshotDate}
  </div>
)}
```

`power_flow_mode` from the manifest could also be shown here dynamically (e.g., "AC flow" once P1 is implemented), but for now "DC flow" is hardcoded in the label since that's always the mode.

---

## Verification

After running `python scripts/build_data.py`:

```sh
cat web/public/data/manifest.json
```

Should produce valid JSON with:
- `generated_at` matching the current UTC time
- `power_flow_mode: "DC"`
- `n_buses: 52`, `n_lines: 57`
- `n_submarine_lines: 5`
- Non-null `total_load_mw` and `total_gen_mw`
- Non-null `hvdc_import_mw`

In the frontend (`npm run dev`):
- StatsPanel shows a footer like "DC flow · May 15, 2026"
- If `manifest.json` is deleted, the footer disappears gracefully (no error)
- If island filters hide Leyte (where Ormoc is), the HVDC row disappears from StatsPanel but the footer date remains (it comes from `manifest`, not from the filtered features)
