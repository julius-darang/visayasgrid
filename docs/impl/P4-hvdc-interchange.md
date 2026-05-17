# P4 — HVDC Interchange Visualization

**Files changed:** `scripts/constants.py`, `scripts/build_data.py`, `web/src/hooks/useGridData.js`, `web/src/App.jsx`, `web/src/components/StatsPanel.jsx`, `web/src/components/InfoPanel.jsx`, `web/src/components/MapView.jsx`  
**Type:** Feature — surfaces existing load flow data that was previously discarded

---

## What

The Leyte–Luzon HVDC link is the most distinctive feature of the Visayas grid — it's the only connection between the island region and the Luzon mainland. Despite this, the previous version of the project treated Ormoc (the HVDC terminus) as a featureless slack bus whose interchange MW was computed but immediately thrown away.

This implementation captures the HVDC interchange value and surfaces it throughout the UI:

- **`manifest.json`** — `hvdc_import_mw` field available for any consumer
- **`buses.geojson`** — Ormoc bus feature has `hvdc_import_mw` property
- **StatsPanel** — "HVDC link" row, colour-coded by direction (violet = import, amber = export)
- **InfoPanel** — dedicated "HVDC link" section when clicking Ormoc
- **MapView** — Ormoc gets a dashed violet outer ring marking it as the interconnection point

A warning is printed during the build if the modelled interchange exceeds the rated 440 MW link capacity.

### Current snapshot result

The current model shows **−475.9 MW** (Visayas exporting to Luzon). This is a modelling artefact: the snapshot dispatch factors (Geothermal 0.85 × 417 MW Kananga alone = 354 MW, plus coal, solar, wind across all islands) produce ~2,211 MW of dispatched generation against ~1,735 MW of load — a 476 MW surplus. The link exports this surplus to Luzon. The warning appears because 476 MW exceeds the 440 MW rated capacity, signalling that the dispatch factors need tuning for a more realistic snapshot.

---

## Why

### The HVDC link is the most interesting thing about the Visayas grid

The Philippines grid has three separate synchronous areas: Luzon, Visayas, and Mindanao. The Leyte–Luzon HVDC link (commissioned 1998, 440 MW rated) is the only power bridge between Luzon and Visayas. The Visayas grid depends on it when local generation is short, and it absorbs Visayas surplus (primarily geothermal from Leyte) when generation exceeds demand.

Before this change, a user looking at the map would see Ormoc as just another substation node. Clicking it showed `bus_type: hvdc` in the raw properties but nothing meaningful. The actual interchange MW was computed by pandapower and then discarded.

### The slack bus already encodes the answer

In a load flow, the slack bus absorbs or injects whatever MW is needed to balance the network. In this model, Ormoc is the slack — so `res_ext_grid["p_mw"]` is literally the answer to "how much power is crossing the HVDC link?" No additional computation is needed. It was simply a matter of reading the number and surfacing it.

### Capacity warning enables model validation

The rated capacity of the HVDC link is 440 MW. If the DC load flow result exceeds this, the dispatch assumption is inconsistent with physical reality. Printing a warning during build gives the pipeline operator a concrete signal to check their dispatch factors or load estimates.

---

## How

### `scripts/constants.py`

```python
HVDC_CAPACITY_MW = 440  # rated MW of the Leyte–Luzon HVDC link
# Source: NGCP TDP 2024 Chapter 5, Table 5-1
```

### `scripts/build_data.py` — capture after DC flow

After `pp.rundcpp(net_run)` succeeds, the ext_grid result is read:

```python
hvdc_import_mw: float | None = None

# ...inside the try block after rundcpp...
if not net_run.res_ext_grid.empty:
    hvdc_import_mw = float(net_run.res_ext_grid["p_mw"].iloc[0])
    if abs(hvdc_import_mw) > HVDC_CAPACITY_MW:
        print(
            f"WARNING: HVDC import {hvdc_import_mw:.0f} MW exceeds "
            f"rated capacity {HVDC_CAPACITY_MW} MW."
        )
    direction = "import" if hvdc_import_mw >= 0 else "export"
    print(f"HVDC ({direction}): {hvdc_import_mw:+.1f} MW at Ormoc.")
```

Sign convention (pandapower standard):
- `p_mw > 0` → ext_grid **injects** into the network → Luzon sending power to Visayas (**import**)
- `p_mw < 0` → ext_grid **absorbs** from the network → Visayas sending power to Luzon (**export**)

`hvdc_import_mw` is passed to `emit_geojson`:

```python
emit_geojson(
    buses_df, lines_df, net, has_results, connected_names,
    hvdc_import_mw=hvdc_import_mw,
    power_flow_mode="DC" if has_results else "none",
)
```

### `scripts/build_data.py` — `emit_geojson` function

The function signature gains two new optional parameters:

```python
def emit_geojson(
    buses_df, lines_df, net, has_results, connected_buses,
    hvdc_import_mw: float | None = None,
    power_flow_mode: str = "none",
) -> None:
```

When building bus features, the HVDC bus gets the extra property:

```python
if props.get("bus_type") == "hvdc":
    props["hvdc_import_mw"] = (
        round(hvdc_import_mw, 1) if hvdc_import_mw is not None else None
    )
```

Using `bus_type == "hvdc"` rather than checking the name `"Ormoc"` directly keeps the logic resilient if the bus is ever renamed.

### `web/src/hooks/useGridData.js` — manifest fetch

A third `fetch` is added to the existing `Promise.all`:

```js
Promise.all([
  fetch("/data/buses.geojson").then((r) => (r.ok ? r.json() : EMPTY)),
  fetch("/data/lines.geojson").then((r) => (r.ok ? r.json() : EMPTY)),
  fetch("/data/manifest.json").then((r) => (r.ok ? r.json() : null)),  // new
])
  .then(([b, l, m]) => {
    setBuses(b);
    setLines(l);
    setManifest(m);   // new state
    setLoading(false);
  })
```

`manifest` is included in the hook's return value and flows through `App.jsx` into `StatsPanel`.

### `web/src/components/StatsPanel.jsx` — HVDC row

The HVDC bus is found by `bus_type` in the visible feature set:

```js
const hvdcBus = features.find((f) => f.properties.bus_type === "hvdc");
const hvdcMw = hvdcBus?.properties?.hvdc_import_mw ?? null;
```

Note: `hvdcMw` can be `null` (if the bus is filtered out of the current island/voltage view, or if the load flow didn't run). The row only renders when `hvdcMw !== null`:

```jsx
{hvdcMw !== null && (
  <>
    <span className="text-slate-500">HVDC link</span>
    <span
      className={hvdcMw >= 0
        ? "text-violet-700 dark:text-violet-400"   // import = violet
        : "text-amber-700 dark:text-amber-400"     // export = amber
      }
      title={hvdcMw >= 0 ? "Importing from Luzon" : "Exporting to Luzon"}
    >
      {hvdcMw >= 0 ? "+" : ""}{hvdcMw.toFixed(0)} MW
    </span>
  </>
)}
```

Colour coding: violet for import (Luzon helping Visayas) vs amber for export (Visayas surplus to Luzon) gives an immediate directional read without needing a +/− sign to be interpreted.

### `web/src/components/InfoPanel.jsx` — HVDC section

Added inside `BusPanel`, after generation and before flow results:

```jsx
{p.bus_type === "hvdc" && p.hvdc_import_mw != null && (
  <Section title="HVDC link">
    <Row label="Luzon interchange">
      {p.hvdc_import_mw >= 0
        ? `+${p.hvdc_import_mw.toFixed(0)} MW import`
        : `${p.hvdc_import_mw.toFixed(0)} MW export`}
    </Row>
    <Row label="Rated capacity">440 MW</Row>
    <Row label="Role">Leyte–Luzon ±350 kV DC</Row>
  </Section>
)}
```

The section only appears for the HVDC bus — other buses are unaffected.

### `web/src/components/MapView.jsx` — dashed violet ring

An additional `CircleMarker` is conditionally rendered for HVDC buses, placed outside the generation ring:

```jsx
const isHvdc = f.properties.bus_type === "hvdc";

{isHvdc && (
  <CircleMarker
    center={[y, x]}
    radius={radius + 5}
    pathOptions={{
      color: "#7c3aed",        // violet-600
      weight: 2,
      fillColor: "transparent",
      fillOpacity: 0,
      interactive: false,      // does not intercept clicks
      dashArray: "4 3",
    }}
  />
)}
```

`interactive: false` ensures the decorative ring doesn't block click events on the main `CircleMarker` beneath it.

---

## Verification

After running `python scripts/build_data.py`:

1. Terminal output should contain a line like:
   ```
   HVDC (export): -475.9 MW at Ormoc.
   ```

2. `web/public/data/manifest.json` should include:
   ```json
   "hvdc_import_mw": -475.9
   ```

3. In `web/public/data/buses.geojson`, the Ormoc feature should have:
   ```json
   "hvdc_import_mw": -475.9
   ```

4. In the frontend (after `npm run dev`):
   - StatsPanel shows "HVDC link: −476 MW" in amber
   - Hovering that row shows tooltip "Exporting to Luzon"
   - Clicking Ormoc on the map opens InfoPanel with an "HVDC link" section
   - Ormoc has a dashed violet outer ring on the map

5. If the Leyte island filter is turned off, Ormoc disappears from the filtered features and the HVDC row in StatsPanel disappears too (correct — it only shows when the HVDC bus is in the current view).
