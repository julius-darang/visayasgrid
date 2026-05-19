import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import Legend from "./components/Legend.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import { useGridData, filterFeatures } from "./hooks/useGridData.js";
import { useTheme } from "./hooks/useTheme.js";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { ISLANDS, VOLTAGE_LEVELS, MAP } from "./lib/styles.js";

const HINT_KEY = "vg-hint-seen";

function parseHash() {
  const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  return new URLSearchParams(h);
}

function initIslands() {
  const p = parseHash().get("islands");
  if (!p) return ISLANDS;
  const picked = ISLANDS.filter((i) => p.split(",").includes(i));
  return picked.length ? picked : ISLANDS;
}

function initVoltages() {
  const p = parseHash().get("kv");
  if (!p) return VOLTAGE_LEVELS;
  const picked = p
    .split(",")
    .map(Number)
    .filter((n) => VOLTAGE_LEVELS.includes(n));
  return picked.length ? picked : VOLTAGE_LEVELS;
}

function featureCenter(g) {
  if (g.type === "Point") {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  const cs = g.coordinates;
  const m = cs[Math.floor(cs.length / 2)] ?? cs[0];
  return { lng: m[0], lat: m[1] };
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [selectedIslands, setSelectedIslands] = useState(initIslands);
  const [selectedVoltages, setSelectedVoltages] = useState(initVoltages);
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colorMode, setColorMode] = usePersistentState(
    "vg-colormode",
    "nominal",
  );
  const [display, setDisplay] = usePersistentState("vg-display", {
    labels: false,
    arrows: true,
    rings: false,
  });
  const [focusTarget, setFocusTarget] = useState(null);
  const [hintDismissed, setHintDismissed] = useState(
    () => !!localStorage.getItem(HINT_KEY),
  );

  // The selected element is carried in the URL hash for sharing, but it
  // can only be resolved once data has loaded — capture it before the
  // URL-sync effect can overwrite it.
  const pendingSel = useRef(parseHash().get("sel"));

  const handleLoad = useCallback((b, l) => {
    const sel = pendingSel.current;
    pendingSel.current = null;
    if (!sel) return;
    let feature;
    let kind;
    if (sel.startsWith("bus:")) {
      kind = "bus";
      const name = sel.slice(4);
      feature = b.features.find((f) => f.properties.name === name);
    } else if (sel.startsWith("line:")) {
      kind = "line";
      const [from, to] = sel.slice(5).split("|");
      feature = l.features.find(
        (f) => f.properties.from_bus === from && f.properties.to_bus === to,
      );
    }
    if (!feature) return;
    setSelected({ kind, feature });
    const c = featureCenter(feature.geometry);
    setFocusTarget({ lat: c.lat, lng: c.lng, zoom: 10, _t: Date.now() });
  }, []);

  const { buses, lines, manifest, loading, error, reload } =
    useGridData(handleLoad);

  const filters = useMemo(
    () => ({ islands: selectedIslands, voltages: selectedVoltages }),
    [selectedIslands, selectedVoltages],
  );
  const visibleBuses = useMemo(
    () => filterFeatures(buses, filters),
    [buses, filters],
  );
  const visibleLines = useMemo(
    () => filterFeatures(lines, filters),
    [lines, filters],
  );

  // Keep the URL hash in sync with the shareable view state. This only
  // writes history (a side effect), never React state.
  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedIslands.length !== ISLANDS.length) {
      p.set("islands", selectedIslands.join(","));
    }
    if (selectedVoltages.length !== VOLTAGE_LEVELS.length) {
      p.set("kv", selectedVoltages.join(","));
    }
    if (selected) {
      const pr = selected.feature.properties;
      p.set(
        "sel",
        selected.kind === "bus"
          ? `bus:${pr.name}`
          : `line:${pr.from_bus}|${pr.to_bus}`,
      );
    }
    const qs = p.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `#${qs}` : window.location.pathname + window.location.search,
    );
  }, [selectedIslands, selectedVoltages, selected]);

  const showHint = !hintDismissed && !loading && !error && !selected;

  const dismissHint = () => {
    setHintDismissed(true);
    localStorage.setItem(HINT_KEY, "1");
  };

  const select = (s) => {
    setSelected(s);
    if (!hintDismissed) dismissHint();
  };

  // Select + recenter the map. Used by search and StatsPanel alerts;
  // plain map clicks intentionally do not recenter.
  const focusFeature = (feature, kind) => {
    select({ kind, feature });
    const c = featureCenter(feature.geometry);
    setFocusTarget({ lat: c.lat, lng: c.lng, zoom: 10, _t: Date.now() });
  };

  const resetView = () => {
    setSelected(null);
    setSelectedIslands(ISLANDS);
    setSelectedVoltages(VOLTAGE_LEVELS);
    setFocusTarget({
      lat: MAP.center[0],
      lng: MAP.center[1],
      zoom: MAP.zoom,
      _t: Date.now(),
    });
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1050] bg-slate-900/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        selectedIslands={selectedIslands}
        setSelectedIslands={setSelectedIslands}
        selectedVoltages={selectedVoltages}
        setSelectedVoltages={setSelectedVoltages}
        colorMode={colorMode}
        setColorMode={setColorMode}
        display={display}
        setDisplay={setDisplay}
        buses={buses}
        onPick={(f) => {
          focusFeature(f, "bus");
          setSidebarOpen(false);
        }}
        onReset={resetView}
        theme={theme}
        onToggleTheme={toggleTheme}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="relative flex-1">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-[1100] rounded-md border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm backdrop-blur transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open filters"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 4h14M2 9h14M2 14h14"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        <MapView
          buses={visibleBuses}
          lines={visibleLines}
          onSelect={select}
          theme={theme}
          colorMode={colorMode}
          display={display}
          selected={selected}
          focusTarget={focusTarget}
        />
        <StatsPanel
          buses={visibleBuses}
          lines={visibleLines}
          manifest={manifest}
          onFocus={focusFeature}
        />
        <Legend colorMode={colorMode} />
        <InfoPanel
          selected={selected}
          onClose={() => setSelected(null)}
          manifest={manifest}
        />

        <div
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2"
        >
          {loading && (
            <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs text-slate-600 shadow dark:bg-slate-800/95 dark:text-slate-300">
              <span className="h-3 w-3 animate-spin-slow rounded-full border-2 border-slate-300 border-t-sky-500 dark:border-slate-600 dark:border-t-sky-400" />
              Loading grid data…
            </div>
          )}
          {error && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-800 shadow dark:bg-red-900/50 dark:text-red-200">
              <span>Couldn’t load grid data.</span>
              <button
                onClick={reload}
                className="rounded border border-red-300 px-2 py-0.5 font-medium transition hover:bg-red-200 focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-700 dark:hover:bg-red-900"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {showHint && (
          <button
            onClick={dismissHint}
            className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 animate-fade-in rounded-full bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur transition hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-sky-400 dark:bg-slate-100/90 dark:text-slate-900 dark:hover:bg-white"
          >
            Tap a bus or line for details — got it
          </button>
        )}
      </main>
    </div>
  );
}
