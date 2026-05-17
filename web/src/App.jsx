import { useMemo, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import Legend from "./components/Legend.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import { useGridData, filterFeatures } from "./hooks/useGridData.js";
import { useTheme } from "./hooks/useTheme.js";
import { ISLANDS, VOLTAGE_LEVELS } from "./lib/styles.js";

const HINT_KEY = "vg-hint-seen";

export default function App() {
  const { buses, lines, manifest, loading, error, reload } = useGridData();
  const [theme, toggleTheme] = useTheme();
  const [selectedIslands, setSelectedIslands] = useState(ISLANDS);
  const [selectedVoltages, setSelectedVoltages] = useState(VOLTAGE_LEVELS);
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colorMode, setColorMode] = useState("nominal");
  const [focusTarget, setFocusTarget] = useState(null);
  const [hintDismissed, setHintDismissed] = useState(
    () => !!localStorage.getItem(HINT_KEY),
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
    const g = feature.geometry;
    let lat;
    let lng;
    if (g.type === "Point") {
      [lng, lat] = g.coordinates;
    } else {
      const cs = g.coordinates;
      const mid = cs[Math.floor(cs.length / 2)] ?? cs[0];
      [lng, lat] = mid;
    }
    setFocusTarget({ lat, lng, zoom: 10, _t: Date.now() });
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
        buses={buses}
        onPick={(f) => {
          focusFeature(f, "bus");
          setSidebarOpen(false);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="relative flex-1">
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-4 top-4 z-[1000] rounded-md border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm backdrop-blur transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
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

        <MapView
          buses={visibleBuses}
          lines={visibleLines}
          onSelect={select}
          theme={theme}
          colorMode={colorMode}
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
