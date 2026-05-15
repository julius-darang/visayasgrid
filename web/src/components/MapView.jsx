import { MapContainer, TileLayer, CircleMarker, Polyline } from "react-leaflet";
import {
  colorForVoltage,
  radiusForVoltage,
  lineStyle,
} from "../lib/styles.js";

const VISAYAS_CENTER = [10.7, 123.5];
const ZOOM = 8;

export default function MapView({ buses, lines, onSelect }) {
  return (
    <MapContainer
      center={VISAYAS_CENTER}
      zoom={ZOOM}
      className="h-full w-full"
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {lines.features.map((f, i) => {
        const coords = f.geometry.coordinates.map(([x, y]) => [y, x]);
        return (
          <Polyline
            key={`line-${i}`}
            positions={coords}
            pathOptions={lineStyle(f)}
            eventHandlers={{
              click: () => onSelect({ kind: "line", feature: f }),
            }}
          />
        );
      })}
      {buses.features.map((f, i) => {
        const [x, y] = f.geometry.coordinates;
        const v = Number(f.properties.v_nom);
        return (
          <CircleMarker
            key={`bus-${i}`}
            center={[y, x]}
            radius={radiusForVoltage(v)}
            pathOptions={{
              color: "#111",
              weight: 1,
              fillColor: colorForVoltage(v),
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onSelect({ kind: "bus", feature: f }),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
