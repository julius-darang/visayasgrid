import { Fragment, useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Marker,
  Tooltip,
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

export default function MapView({
  buses,
  lines,
  onSelect,
  theme,
  colorMode,
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
      aria-label="Interactive map of the Visayas transmission grid. Pan with arrow keys; click a bus or line for details."
    >
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
          !dim && pmw != null && Math.abs(pmw) >= FLOW_ARROW_MIN_MW;
        let arrow = null;
        if (showArrow) {
          const [a, b] = coords;
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const dir = pmw >= 0 ? bearing(a, b) : bearing(b, a);
          const icon = flowArrowIcon(
            dir - 90,
            colorForLoading(f.properties.loading_percent),
          );
          arrow = <Marker position={mid} icon={icon} interactive={false} />;
        }
        return (
          <Fragment key={`line-${i}`}>
            <Polyline
              positions={coords}
              pathOptions={{
                ...lineStyle(f),
                opacity: dim ? 0.12 : lineStyle(f).opacity,
              }}
              eventHandlers={{
                click: () => onSelect({ kind: "line", feature: f }),
              }}
            />
            {arrow}
          </Fragment>
        );
      })}

      {buses.features.map((f, i) => {
        const [x, y] = f.geometry.coordinates;
        const v = Number(f.properties.v_nom);
        const radius = radiusForBus(f.properties);
        const hasGen = (f.properties.gen_capacity_mw || 0) > 0;
        const isHvdc = f.properties.bus_type === "hvdc";
        const dim = active && !active.busNames.has(f.properties.name);
        const fill =
          colorMode === "pu"
            ? colorForVoltagePu(f.properties.vm_pu)
            : colorForVoltage(v);

        return (
          <Fragment key={`bus-${i}`}>
            {hasGen && (
              <CircleMarker
                center={[y, x]}
                radius={radius + 3}
                pathOptions={{
                  color: colorForCarrier(f.properties.primary_carrier),
                  weight: 2,
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
                radius={radius + 5}
                pathOptions={{
                  color: "#7c3aed",
                  weight: 2,
                  fillColor: "transparent",
                  fillOpacity: 0,
                  opacity: dim ? 0.15 : 1,
                  interactive: false,
                  dashArray: "4 3",
                }}
              />
            )}
            <CircleMarker
              center={[y, x]}
              radius={radius}
              pathOptions={{
                color: busStroke,
                weight: 1,
                opacity: dim ? 0.2 : 1,
                fillColor: fill,
                fillOpacity: dim ? 0.2 : 0.92,
              }}
              eventHandlers={{
                click: () => onSelect({ kind: "bus", feature: f }),
              }}
            >
              <Tooltip
                permanent
                direction="right"
                offset={[radius + 2, 0]}
                className={dim ? "bus-label bus-label-dim" : "bus-label"}
              >
                {f.properties.name}
              </Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
