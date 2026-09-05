import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY = { type: "FeatureCollection", features: [] };

// Demand scenarios live in /data/{scenario}/ except "peak" which is the
// root (/data/) for backward compatibility. "ac" is also treated as root
// so any bookmarked URLs from before the demand-scenario migration keep working.
function baseFor(scenario) {
  return !scenario || scenario === "ac" || scenario === "peak"
    ? "/data"
    : `/data/${scenario}`;
}

export async function fetchGridData(base, fetcher = fetch) {
  const files = ["buses.geojson", "lines.geojson", "manifest.json"];
  const responses = await Promise.all(
    files.map(async (file) => {
      const response = await fetcher(`${base}/${file}`);
      if (!response.ok) {
        throw new Error(`Couldn't load ${file}.`);
      }
      return response.json();
    }),
  );
  return responses;
}

export function useGridData(scenario = "peak", onLoad) {
  const [buses, setBuses] = useState(EMPTY);
  const [lines, setLines] = useState(EMPTY);
  const [manifest, setManifest] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [failure, setFailure] = useState(null);
  const [nonce, setNonce] = useState(0);
  const requestKey = `${scenario}:${nonce}`;
  const error = failure?.key === requestKey ? failure.error : null;
  const loading = loadedKey !== requestKey && !error;

  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = baseFor(scenario);
    fetchGridData(base)
      .then(([b, l, m]) => {
        if (cancelled) return;
        setBuses(b);
        setLines(l);
        setManifest(m);
        setLoadedKey(requestKey);
        setFailure(null);
        onLoadRef.current?.(b, l);
      })
      .catch((e) => {
        if (cancelled) return;
        setFailure({ key: requestKey, error: e });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, scenario]);

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
