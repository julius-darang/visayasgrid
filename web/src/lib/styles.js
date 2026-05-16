export const MAP = {
  center: [10.7, 123.5],
  zoom: 8,
  flowArrowMinMw: 30,
};

export const HVDC_LINK = {
  ratedMw: 440,
  label: "Leyte–Luzon ±350 kV DC",
};

export const VOLTAGE_COLORS = {
  350: "#7209b7",
  230: "#e63946",
  138: "#f4a261",
  69: "#2a9d8f",
};

export const VOLTAGE_LEVELS = [350, 230, 138, 69];

export const ISLANDS = [
  "Cebu",
  "Leyte",
  "Samar",
  "Negros",
  "Panay",
  "Bohol",
  "Biliran",
  "Guimaras",
];

export const CARRIER_COLORS = {
  Coal:       "#1f2937",
  Geothermal: "#16a34a",
  Solar:      "#facc15",
  Wind:       "#06b6d4",
  Hydro:      "#2563eb",
  Biomass:    "#84cc16",
  Diesel:     "#ea580c",
  ROR:        "#60a5fa",
};

export const CARRIER_LIST = Object.keys(CARRIER_COLORS);

export function colorForVoltage(kv) {
  return VOLTAGE_COLORS[kv] ?? "#888";
}

export function colorForCarrier(carrier) {
  return CARRIER_COLORS[carrier] ?? "#6b7280";
}

export const LOADING_UNKNOWN_COLOR = "#94a3b8";

// Single source for the line-loading colour scale. The legend renders this
// array directly so the map and legend can never drift apart.
export const LOADING_SCALE = [
  { label: "< 50%", color: "#2d6a4f" },
  { label: "50–80%", color: "#f4a261" },
  { label: "80–100%", color: "#e63946" },
  { label: "> 100%", color: "#9b2226" },
];

const [LOAD_LOW, LOAD_MID, LOAD_HIGH, LOAD_OVER] = LOADING_SCALE.map(
  (s) => s.color,
);

export function colorForLoading(pct) {
  if (pct == null) return LOADING_UNKNOWN_COLOR;
  if (pct > 100) return LOAD_OVER;
  if (pct >= 80) return LOAD_HIGH;
  if (pct >= 50) return LOAD_MID;
  return LOAD_LOW;
}

export function radiusForBus(props) {
  const v = Number(props.v_nom);
  const base = v >= 230 ? 6 : v >= 138 ? 5 : 4;
  // Bus with significant generation gets a size bump (logarithmic).
  const gen = Number(props.gen_capacity_mw || 0);
  if (gen > 0) return base + Math.min(6, Math.log10(gen + 1) * 2.5);
  return base;
}

export function lineStyle(feature) {
  const { loading_percent, is_submarine } = feature.properties;
  return {
    color: colorForLoading(loading_percent),
    weight: 2.5,
    opacity: 0.85,
    dashArray: is_submarine ? "6 5" : undefined,
  };
}
