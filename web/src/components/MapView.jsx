import { Fragment, useEffect, useMemo, useRef, memo } from "react";
import L from "leaflet";
import { basemapFor } from "../lib/basemap.js";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Marker,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import {
  colorForVoltage,
  colorForVoltagePu,
  colorForCarrier,
  colorForLoading,
  radiusForBus,
  lineStyle,
  MAP,
} from "../lib/styles.js";

const FLOW_ARROW_MIN_MW = MAP.flowArrowMinMw;

function MapController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? map.getZoom(), {
      duration: 0.6,
    });
  }, [target, map]);
  return null;
}

function connectedSet(selected, lines) {
  if (!selected) return null;
  const p = selected.feature.properties;
  const busNames = new Set();
  const lineKeys = new Set();
  const keyOf = (lp) => `${lp.from_bus}|${lp.to_bus}`;
  if (selected.kind === "bus") {
    busNames.add(p.name);
    for (const f of lines.features) {
      const lp = f.properties;
      if (lp.from_bus === p.name || lp.to_bus === p.name) {
        lineKeys.add(keyOf(lp));
        busNames.add(lp.from_bus);
        busNames.add(lp.to_bus);
      }
    }
  } else {
    busNames.add(p.from_bus);
    busNames.add(p.to_bus);
    lineKeys.add(keyOf(p));
  }
  return { busNames, lineKeys };
}

function bearing([lat1, lon1], [lat2, lon2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Module-level icon caches. L.divIcon objects are stable across renders so
// react-leaflet won't trigger DOM swaps when only opacity/selection changes.
const _arrowCache = new Map();
function getArrowIcon(rotation, color) {
  const key = `${rotation}|${color}`;
  if (!_arrowCache.has(key)) {
    _arrowCache.set(key, L.divIcon({
      html: `<div style="transform:rotate(${rotation}deg);color:${color};font-size:12px;line-height:12px">▶</div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      className: "flow-arrow",
    }));
  }
  return _arrowCache.get(key);
}

const _squareCache = new Map();
function getSquareIcon(radius, fill, stroke, fillOpacity, strokeOpacity) {
  const key = `${radius}|${fill}|${stroke}|${fillOpacity}|${strokeOpacity}`;
  if (!_squareCache.has(key)) {
    const size = Math.round(radius * 2);
    const pad = 1;
    const total = size + pad * 2;
    _squareCache.set(key, L.divIcon({
      html: `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible"><rect x="${pad}" y="${pad}" width="${size}" height="${size}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="0.75"/></svg>`,
      iconSize: [total, total],
      iconAnchor: [total / 2, total / 2],
      className: "",
    }));
  }
  return _squareCache.get(key);
}

export default memo(function MapView({
  buses,
  lines,
  onSelect,
  theme,
  colorMode,
  lineColorMode,
  display,
  selected,
  focusTarget,
}) {
  const isDark = theme === "dark";
  const basemap = basemapFor(theme, import.meta.env.VITE_CARTO_API_KEY);
  const busStroke = isDark ? "#e2e8f0" : "#1e293b";

  // Memoize connected-set — iterates all lines and is only needed when
  // selection or topology actually changes.
  const active = useMemo(() => connectedSet(selected, lines), [selected, lines]);

  // Keep onSelect in a ref so the stable handler closures below always call
  // the latest version without needing to be recreated themselves.
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Pre-compute coordinate arrays once per data load — geometry is static.
  const lineCoords = useMemo(
    () => lines.features.map((f) => f.geometry.coordinates.map(([x, y]) => [y, x])),
    [lines],
  );

  // Stable per-element event handlers — recreated only when the underlying
  // data changes, not on every selection or display toggle. This prevents
  // react-leaflet from re-registering listeners on every render.
  const lineHandlers = useMemo(
    () => lines.features.map((f) => ({ click: () => onSelectRef.current({ kind: "line", feature: f }) })),
    [lines],
  );
  const busHandlers = useMemo(
    () => buses.features.map((f) => ({ click: () => onSelectRef.current({ kind: "bus", feature: f }) })),
    [buses],
  );

  return (
    <MapContainer
      center={MAP.center}
      zoom={MAP.zoom}
      className="h-full w-full"
      preferCanvas
      zoomControl={false}
      aria-label="Interactive map of the Visayas transmission grid. Pan with arrow keys; click a bus or line for details."
    >
      <ZoomControl position="bottomright" />
      <MapController target={focusTarget} />
      <TileLayer {...basemap} />

      {lines.features.map((f, i) => {
        const coords = lineCoords[i];
        const lp = f.properties;
        const dim = active && !active.lineKeys.has(`${lp.from_bus}|${lp.to_bus}`);
        const pmw = lp.p_from_mw;
        const showArrow =
          display.arrows &&
          !dim &&
          pmw != null &&
          Math.abs(pmw) >= FLOW_ARROW_MIN_MW;
        const isSelectedLine =
          selected?.kind === "line" &&
          selected.feature.properties.from_bus === lp.from_bus &&
          selected.feature.properties.to_bus === lp.to_bus;
        const style = lineStyle(f, lineColorMode);

        let arrow = null;
        if (showArrow) {
          const [a, b] = coords;
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const arrowColor =
            lineColorMode === "voltage"
              ? colorForVoltage(lp.voltage_kv)
              : colorForLoading(lp.loading_percent);
          const dir = pmw >= 0 ? bearing(a, b) : bearing(b, a);
          arrow = (
            <Marker
              position={mid}
              icon={getArrowIcon(dir - 90, arrowColor)}
              interactive={false}
            />
          );
        }

        const direction = (pmw ?? 0) >= 0 ? "→" : "←";
        return (
          <Fragment key={`line-${i}`}>
            <Polyline
              positions={coords}
              pathOptions={{ ...style, opacity: dim ? 0.12 : style.opacity }}
              eventHandlers={lineHandlers[i]}
            >
              <Tooltip sticky>
                <div className="font-semibold">{lp.voltage_kv} kV</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {lp.from_bus} {direction} {lp.to_bus}
                </div>
                {lp.loading_percent != null && (
                  <div>Loading: {Number(lp.loading_percent).toFixed(1)}%</div>
                )}
                {pmw != null && (
                  <div>Flow: {Math.abs(Number(pmw)).toFixed(1)} MW</div>
                )}
              </Tooltip>
            </Polyline>
            {isSelectedLine && (
              <Polyline
                positions={coords}
                pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.5, interactive: false }}
              />
            )}
            {arrow}
          </Fragment>
        );
      })}

      {buses.features.map((f, i) => {
        const [x, y] = f.geometry.coordinates;
        const v = Number(f.properties.v_nom);
        const isGenerator = f.properties.bus_type === "generator";
        const isHvdc = f.properties.bus_type === "hvdc";
        const radius = radiusForBus(f.properties, isGenerator);
        const hasGen = (f.properties.gen_capacity_mw || 0) > 0;
        const dim = active && !active.busNames.has(f.properties.name);
        const showLabel =
          display.labels || (active && active.busNames.has(f.properties.name));
        const fill = isGenerator
          ? colorForCarrier(f.properties.primary_carrier)
          : colorMode === "pu"
            ? colorForVoltagePu(f.properties.vm_pu)
            : colorForVoltage(v);
        const isSelectedBus =
          selected?.kind === "bus" &&
          selected.feature.properties.name === f.properties.name;
        const fillOpacity = dim ? 0.2 : 0.92;
        const strokeOpacity = dim ? 0.2 : 1;

        const label = showLabel ? (
          <Tooltip
            permanent
            direction="right"
            offset={[radius + 2, 0]}
            className={dim ? "bus-label bus-label-dim" : "bus-label"}
          >
            {f.properties.name}
          </Tooltip>
        ) : null;

        return (
          <Fragment key={`bus-${i}`}>
            {/* Ring only on substations — generator circles already encode fuel via fill color */}
            {hasGen && !isGenerator && display.rings && (
              <CircleMarker
                center={[y, x]}
                radius={radius + 2.5}
                pathOptions={{
                  color: colorForCarrier(f.properties.primary_carrier),
                  weight: 1.25,
                  fillColor: "transparent",
                  fillOpacity: 0,
                  opacity: dim ? 0.15 : 1,
                  interactive: false,
                }}
              />
            )}
            {/* HVDC bus gets a distinct outer ring to mark the Luzon interchange point. */}
            {isHvdc && (
              <CircleMarker
                center={[y, x]}
                radius={radius + 4}
                pathOptions={{
                  color: "#7c3aed",
                  weight: 1.25,
                  fillColor: "transparent",
                  fillOpacity: 0,
                  opacity: dim ? 0.15 : 1,
                  interactive: false,
                  dashArray: "3 3",
                }}
              />
            )}
            {/* bus_type=generator → circle; everything else (substation, hvdc) → square */}
            {isGenerator ? (
              <CircleMarker
                center={[y, x]}
                radius={radius}
                pathOptions={{
                  color: busStroke,
                  weight: 0.75,
                  opacity: strokeOpacity,
                  fillColor: fill,
                  fillOpacity,
                }}
                eventHandlers={busHandlers[i]}
              >
                {label}
              </CircleMarker>
            ) : (
              <Marker
                position={[y, x]}
                icon={getSquareIcon(radius, fill, busStroke, fillOpacity, strokeOpacity)}
                eventHandlers={busHandlers[i]}
              >
                {label}
              </Marker>
            )}
            {/* Selection halo — sky-blue ring that makes the selected bus unmistakable */}
            {isSelectedBus && (
              <CircleMarker
                center={[y, x]}
                radius={radius + 7}
                pathOptions={{
                  color: "#0ea5e9",
                  weight: 2.5,
                  fillColor: "transparent",
                  fillOpacity: 0,
                  opacity: 0.9,
                  interactive: false,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </MapContainer>
  );
});
