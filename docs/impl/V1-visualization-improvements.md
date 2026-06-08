# V1 — Visualization Improvements: Shape Distinction, Line Color Toggle, Performance

**Files changed:** `web/src/components/MapView.jsx`, `web/src/components/Sidebar.jsx`, `web/src/components/Legend.jsx`, `web/src/components/InfoPanel.jsx` (tooltip), `web/src/App.jsx`, `web/src/lib/styles.js`  
**Type:** Feature + Performance

---

## What

Three user-facing improvements and one performance overhaul.

### 1. Generator circles vs substation squares

Buses now use distinct shapes based on `bus_type`:

- **`bus_type === "generator"`** → circle (`CircleMarker`), fill = carrier/fuel colour, size scales with `gen_capacity_mw`
- **`bus_type === "substation"` or `"hvdc"`** → square (`Marker` + inline SVG `divIcon`), fill = nominal voltage colour, size fixed by voltage class

Previously all buses were circles and the only distinction was an optional carrier ring. The ring is now reserved for substation squares that carry aggregated generation (buses where generators are co-located with the switching node but not yet split into separate generator nodes). Generator circles use fill colour directly and show no ring.

The criterion is strictly `bus_type`, not `gen_capacity_mw > 0`, because many substation buses have aggregated generation rolled up onto them from attached plants. The plan is to eventually add dedicated generator nodes with their own coordinates; when that happens they will automatically render as circles.

### 2. Line color toggle

A "Colour lines by" toggle was added to the Sidebar Display section:

- **% Loading** (default) — the existing green → amber → red → dark-red thermal rating scale
- **Voltage kV** — lines coloured by nominal voltage using the same palette as bus markers (violet/red/amber/teal)

State is persisted to `localStorage` (key `vg-line-colormode`). Flow arrows update to match the active mode. The Legend's second panel switches between the loading scale and the voltage scale based on the active mode.

`lineStyle()` in `styles.js` was extended with an optional `colorMode` parameter (default `"loading"`).

### 3. Line hover tooltip

Hovering any transmission line now shows a sticky Leaflet tooltip:

```
138 kV
Bacolod → Cadiz
Loading: 42.1%
Flow: 85.4 MW
```

Voltage kV is the headline. Loading and flow are secondary. The tooltip uses `sticky: true` so it tracks the cursor. Previously there was no hover feedback; details required a click to open InfoPanel.

---

## Why each shape decision was made

| Question | Decision | Reason |
|---|---|---|
| Which shape for generators? | Circle | Circles are the conventional power-system symbol for generators; squares for switchgear/substations |
| Shape criterion | `bus_type === "generator"` | `gen_capacity_mw > 0` incorrectly flags major substations (e.g. Kananga 490 MW, Iloilo PEDC 317 MW) that aggregate attached plants — they are still substations |
| Generator fill colour | Carrier colour | Immediately identifies plant type without needing a separate ring |
| Substation square size | Voltage class only (no gen boost) | Size should signal voltage level; a 138 kV substation with 300 MW attached gen shouldn't visually dominate a 230 kV pure substation |
| Rings on substations | Kept | Blended-generation signal until proper generator nodes are split out |
| Rings on generator circles | Removed | Fill already encodes carrier; ring is redundant |

---

## Performance overhaul

The map was laggy on selection changes because every React render recreated expensive objects. Five fixes applied:

### 1. Module-level icon caches

`_squareCache` and `_arrowCache` are `Map` objects at module scope (outside the React component). `L.divIcon` objects are created once per unique parameter key and reused on subsequent renders.

**Why this matters:** react-leaflet compares the `icon` prop by reference. A new `L.divIcon` object (even with identical parameters) is treated as a changed prop, causing a DOM update for the marker. With ~45 substation squares, every selection change previously triggered 45 DOM swaps. With the cache, the same icon object is returned → no DOM update.

```javascript
// Before: new object on every render
icon={squareIconForBus(radius, fill, busStroke, fillOpacity, strokeOpacity)}

// After: same object returned from cache if params unchanged
icon={getSquareIcon(radius, fill, busStroke, fillOpacity, strokeOpacity)}
```

### 2. `useMemo` for `connectedSet`

The topology walk (finding which buses/lines are connected to the selected element) iterates all ~60 lines. It was called bare in the render body — recomputed on every render even if `selected` and `lines` hadn't changed.

```javascript
const active = useMemo(() => connectedSet(selected, lines), [selected, lines]);
```

### 3. `useMemo` for `lineCoords`

GeoJSON coordinates are static after data load. The `[y, x]` swap was being run for all ~60 lines on every render.

```javascript
const lineCoords = useMemo(
  () => lines.features.map((f) => f.geometry.coordinates.map(([x, y]) => [y, x])),
  [lines],
);
```

### 4. Stable event handlers

`lineHandlers` and `busHandlers` are arrays of `{ click: fn }` objects, `useMemo`'d on the data reference. react-leaflet compares `eventHandlers` by reference and re-registers listeners when the object changes. Previously a new handler object was created on every render for every element.

An `onSelectRef` ref keeps the handler closures pointing to the latest `onSelect` without invalidating the memoized arrays.

```javascript
const onSelectRef = useRef(onSelect);
useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

const lineHandlers = useMemo(
  () => lines.features.map((f) => ({ click: () => onSelectRef.current({ kind: "line", feature: f }) })),
  [lines],
);
```

### 5. `React.memo` on `MapView` + stable `onSelect` in `App`

`MapView` is wrapped in `React.memo`. Without this, every `App` state change (opening the sidebar, dismissing the hint toast, opening the data table, toggling the about modal) caused a full MapView re-render.

`select` and `focusFeature` in `App` are wrapped in `useCallback` with a `hintDismissedRef` so they are stable function references. This allows `React.memo` on MapView to actually skip renders when those props haven't meaningfully changed.

---

## Key files

| File | Change |
|---|---|
| `web/src/components/MapView.jsx` | Square/circle rendering, icon caches, useMemo, React.memo |
| `web/src/lib/styles.js` | `lineStyle(feature, colorMode)` — added colorMode param; `radiusForBus(props, genBoost)` — added genBoost param |
| `web/src/components/Sidebar.jsx` | Added "Colour lines by" toggle (lineColorMode); added lineColorMode/setLineColorMode props |
| `web/src/components/Legend.jsx` | Shape key (circle=generator, square=substation); dynamic line color section switches between loading and voltage scales |
| `web/src/App.jsx` | Added lineColorMode persistent state; useCallback for select/focusFeature; hintDismissedRef |
