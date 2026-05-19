import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import Legend from "./components/Legend.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import DataTable from "./components/DataTable.jsx";
import { useGridData, filterFeatures } from "./hooks/useGridData.js";
import { useTheme } from "./hooks/useTheme.js";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { ISLANDS, VOLTAGE_LEVELS, MAP } from "./lib/styles.js";
import {
  parseViewState,
  encodeViewState,
  parseSel,
} from "./lib/viewState.js";
import { featureCenter } from "./lib/grid.js";

const HINT_KEY = "vg-hint-seen";
const initial = parseViewState(
  typeof window !== "undefined" ? window.location.hash : "",
);

const SCENARIOS = [{ id: "ac", label: "AC — Newton-Raphson" }];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [selectedIslands, setSelectedIslands] = useState(initial.islands);
  const [selectedVoltages, setSelectedVoltages] = useState(initial.voltages);
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [scenario, setScenario] = useState("ac");
  const [dcAvailable, setDcAvailable] = useState(false);
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

  // Selection is resolved once data loads — capture it before the
  // URL-sync effect can clear the hash.
  const pendingSel = useRef(initial.sel);

  const handleLoad = useCallback((b, l) => {
    const want = parseSel(pendingSel.current);
    pendingSel.current = null;
    if (!want) return;
    const feature =
      want.kind === "bus"
        ? b.features.find((f) => f.properties.name === want.name)
        : l.features.find(
            (f) =>
              f.properties.from_bus === want.from &&
              f.properties.to_bus === want.to,
          );
    if (!feature) return;
    setSelected({ kind: want.kind, feature });
    const c = featureCenter(feature.geometry);
    setFocusTarget({ lat: c.lat, lng: c.lng, zoom: 10, _t: Date.now() });
  }, []);

  const { buses, lines, manifest, loading, error, reload } = useGridData(
    scenario,
    handleLoad,
  );

  // Probe for an optional pre-generated DC dataset.
  useEffect(() => {
    let cancelled = false;
    fetch("/data/dc/manifest.json", { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setDcAvailable(r.ok);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const scenarios = useMemo(
    () =>
      dcAvailable
        ? [...SCENARIOS, { id: "dc", label: "DC — linear" }]
        : SCENARIOS,
    [dcAvailable],
  );

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

  // Keep the URL hash in sync with the shareable view state (history
  // only — never React state).
  useEffect(() => {
    const qs = encodeViewState({
      islands: selectedIslands,
      voltages: selectedVoltages,
      selected,
    });
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

  // Select + recenter the map. Used by search, the data table and
  // StatsPanel alerts; plain map clicks intentionally do not recenter.
  const focusFeature = (feature, kind) => {
    select({ kind, feature });
    const c = featureCenter(feature.geometry);
    setFocusTarget({ lat: c.lat, lng: c.lng, zoom: 10, _t: Date.now() });
  };

  const toggleVoltage = (kv) =>
    setSelectedVoltages((cur) =>
      cur.includes(kv) ? cur.filter((v) => v !== kv) : [...cur, kv],
    );

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
        scenario={scenario}
        setScenario={setScenario}
        scenarios={scenarios}
        buses={buses}
        onPick={(f) => {
          focusFeature(f, "bus");
          setSidebarOpen(false);
        }}
        onReset={resetView}
        onOpenTable={() => {
          setTableOpen(true);
          setSidebarOpen(false);
        }}
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
        <Legend
          colorMode={colorMode}
          selectedVoltages={selectedVoltages}
          onToggleVoltage={toggleVoltage}
        />
        <InfoPanel
          selected={selected}
          onClose={() => setSelected(null)}
          manifest={manifest}
        />
        {tableOpen && (
          <DataTable
            buses={visibleBuses}
            lines={visibleLines}
            onClose={() => setTableOpen(false)}
            onFocus={(f, k) => {
              focusFeature(f, k);
              setTableOpen(false);
            }}
          />
        )}

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
