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

export function colorForVoltage(kv) {
  return VOLTAGE_COLORS[kv] ?? "#888";
}

export function colorForLoading(pct) {
  if (pct == null) return "#888";
  if (pct > 100) return "#9b2226";
  if (pct >= 80) return "#e63946";
  if (pct >= 50) return "#f4a261";
  return "#2d6a4f";
}

export function radiusForVoltage(kv) {
  if (kv >= 230) return 7;
  if (kv >= 138) return 6;
  return 5;
}

export function lineStyle(feature) {
  const { loading_percent, is_submarine } = feature.properties;
  return {
    color: colorForLoading(loading_percent),
    weight: 3,
    opacity: 0.85,
    dashArray: is_submarine ? "6 4" : undefined,
  };
}
