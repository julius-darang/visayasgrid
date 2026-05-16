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

export function colorForLoading(pct) {
  if (pct == null) return "#94a3b8";
  if (pct > 100) return "#9b2226";
  if (pct >= 80) return "#e63946";
  if (pct >= 50) return "#f4a261";
  return "#2d6a4f";
}

// Voltage magnitude colour scale for AC load flow results.
// Green = nominal (±3%), amber = caution (±3–5%), red = violation (outside ±5%).
export const VM_PU_SCALE = [
  { label: "0.95–0.97 / 1.03–1.05", color: "#f4a261" },
  { label: "0.97–1.03 (nominal)",    color: "#2d6a4f" },
  { label: "< 0.95 or > 1.05",       color: "#9b2226" },
];

export function colorForVoltagePu(pu) {
  if (pu == null) return "#94a3b8";
  if (pu < 0.95 || pu > 1.05) return "#9b2226";
  if (pu < 0.97 || pu > 1.03) return "#f4a261";
  return "#2d6a4f";
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
