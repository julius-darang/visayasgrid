import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY = { type: "FeatureCollection", features: [] };

// Each scenario is a sub-folder of /data; "ac" is the deployed default
// at the root for backward compatibility.
function baseFor(scenario) {
  return !scenario || scenario === "ac" ? "/data" : `/data/${scenario}`;
}

export function useGridData(scenario = "ac", onLoad) {
  const [buses, setBuses] = useState(EMPTY);
  const [lines, setLines] = useState(EMPTY);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = baseFor(scenario);
    Promise.all([
      fetch(`${base}/buses.geojson`).then((r) => (r.ok ? r.json() : EMPTY)),
      fetch(`${base}/lines.geojson`).then((r) => (r.ok ? r.json() : EMPTY)),
      fetch(`${base}/manifest.json`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([b, l, m]) => {
        if (cancelled) return;
        setBuses(b);
        setLines(l);
        setManifest(m);
        setLoading(false);
        onLoadRef.current?.(b, l);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce, scenario]);

  return { buses, lines, manifest, loading, error, reload };
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
