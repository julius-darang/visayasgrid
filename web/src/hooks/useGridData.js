import { useEffect, useState } from "react";

const EMPTY = { type: "FeatureCollection", features: [] };

export function useGridData() {
  const [buses, setBuses] = useState(EMPTY);
  const [lines, setLines] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/buses.geojson").then((r) => (r.ok ? r.json() : EMPTY)),
      fetch("/data/lines.geojson").then((r) => (r.ok ? r.json() : EMPTY)),
    ])
      .then(([b, l]) => {
        if (cancelled) return;
        setBuses(b);
        setLines(l);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { buses, lines, loading, error };
}

export function filterFeatures(fc, { islands, voltages }) {
  if (!fc?.features) return EMPTY;
  const islandSet = islands ? new Set(islands) : null;
  const voltageSet = voltages ? new Set(voltages.map(Number)) : null;
  const filtered = fc.features.filter((f) => {
    const p = f.properties;
    if (islandSet && p.island && !islandSet.has(p.island)) return false;
    if (voltageSet) {
      const v = Number(p.v_nom ?? p.voltage_kv);
      if (v && !voltageSet.has(v)) return false;
    }
    return true;
  });
  return { type: "FeatureCollection", features: filtered };
}
