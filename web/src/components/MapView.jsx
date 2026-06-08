import { Fragment, useEffect } from "react";
import L from "leaflet";
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

// Names of the buses/lines connected to the current selection. Used to dim
// everything else so the selected element's local topology stands out.
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

const TILE_URLS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
};

function bearing([lat1, lon1], [lat2, lon2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function flowArrowIcon(rotation, color) {
  return L.divIcon({
    html: `<div style="transform: rotate(${rotation}deg); color: ${color}; font-size: 12px; line-height: 12px;">▶</div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    className: "flow-arrow",
  });
}

function squareIconForBus(radius, fill, stroke, fillOpacity, strokeOpacity) {
  const size = Math.round(radius * 2);
  const pad = 1;
  const total = size + pad * 2;
  return L.divIcon({
    html: `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible"><rect x="${pad}" y="${pad}" width="${size}" height="${size}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="0.75"/></svg>`,
    iconSize: [total, total],
    iconAnchor: [total / 2, total / 2],
    className: "",
  });
}

export default function MapView({
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
  const busStroke = isDark ? "#e2e8f0" : "#1e293b";
  const active = connectedSet(selected, lines);

  return (
    <MapContainer
      center={MAP.center}
      zoom={MAP.zoom}
      className="h-full w-full"
      preferCanvas
      zoomControl={false}
      aria-label="Interactive map of the Visayas transmission grid. Pan with arrow keys; click a bus or line for details."
    >
      {/* Bottom-right so the +/- buttons don't sit under the mobile
          hamburger / snapshot panel in the top-left corner. */}
      <ZoomControl position="bottomright" />
      <MapController target={focusTarget} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={TILE_URLS[isDark ? "dark" : "light"]}
        subdomains="abcd"
        maxZoom={19}
      />

      {lines.features.map((f, i) => {
        const coords = f.geometry.coordinates.map(([x, y]) => [y, x]);
        const lp = f.properties;
        const dim = active && !active.lineKeys.has(`${lp.from_bus}|${lp.to_bus}`);
        const pmw = f.properties.p_from_mw;
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
        const arrowColor =
          lineColorMode === "voltage"
            ? colorForVoltage(lp.voltage_kv)
            : colorForLoading(f.properties.loading_percent);
        let arrow = null;
        if (showArrow) {
          const [a, b] = coords;
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const dir = pmw >= 0 ? bearing(a, b) : bearing(b, a);
          arrow = (
            <Marker
              position={mid}
              icon={flowArrowIcon(dir - 90, arrowColor)}
              interactive={false}
            />
          );
        }
        const direction = (lp.p_from_mw ?? 0) >= 0 ? "→" : "←";
        return (
          <Fragment key={`line-${i}`}>
            <Polyline
              positions={coords}
              pathOptions={{
                ...style,
                opacity: dim ? 0.12 : style.opacity,
              }}
              eventHandlers={{
                click: () => onSelect({ kind: "line", feature: f }),
              }}
            >
              <Tooltip sticky>
                <div className="font-semibold">
                  {lp.voltage_kv} kV
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {lp.from_bus} {direction} {lp.to_bus}
                </div>
                {lp.loading_percent != null && (
                  <div>Loading: {Number(lp.loading_percent).toFixed(1)}%</div>
                )}
                {lp.p_from_mw != null && (
                  <div>Flow: {Math.abs(Number(lp.p_from_mw)).toFixed(1)} MW</div>
                )}
              </Tooltip>
            </Polyline>
            {/* Selection halo rendered on top of the line */}
            {isSelectedLine && (
              <Polyline
                positions={coords}
                pathOptions={{
                  color: "#0ea5e9",
                  weight: 5,
                  opacity: 0.5,
                  interactive: false,
                }}
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
        // Circles (generators) scale with plant capacity; squares (substations)
        // scale only with voltage class so size stays a clean voltage signal.
        const radius = radiusForBus(f.properties, isGenerator);
        const hasGen = (f.properties.gen_capacity_mw || 0) > 0;
        const dim = active && !active.busNames.has(f.properties.name);
        const showLabel =
          display.labels || (active && active.busNames.has(f.properties.name));
        const fill =
          colorMode === "pu"
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
            {hasGen && display.rings && (
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
                eventHandlers={{
                  click: () => onSelect({ kind: "bus", feature: f }),
                }}
              >
                {label}
              </CircleMarker>
            ) : (
              <Marker
                position={[y, x]}
                icon={squareIconForBus(radius, fill, busStroke, fillOpacity, strokeOpacity)}
                eventHandlers={{
                  click: () => onSelect({ kind: "bus", feature: f }),
                }}
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
}
