import { useMemo, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import Legend from "./components/Legend.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import { useGridData, filterFeatures } from "./hooks/useGridData.js";
import { useTheme } from "./hooks/useTheme.js";
import { ISLANDS, VOLTAGE_LEVELS } from "./lib/styles.js";

export default function App() {
  const { buses, lines, manifest, loading, error } = useGridData();
  const [theme, toggleTheme] = useTheme();
  const [selectedIslands, setSelectedIslands] = useState(ISLANDS);
  const [selectedVoltages, setSelectedVoltages] = useState(VOLTAGE_LEVELS);
  const [selected, setSelected] = useState(null);

  const filters = { islands: selectedIslands, voltages: selectedVoltages };
  const visibleBuses = useMemo(
    () => filterFeatures(buses, filters),
    [buses, selectedIslands, selectedVoltages],
  );
  const visibleLines = useMemo(
    () => filterFeatures(lines, filters),
    [lines, selectedIslands, selectedVoltages],
  );

  return (
    <div className="flex h-full w-full bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Sidebar
        selectedIslands={selectedIslands}
        setSelectedIslands={setSelectedIslands}
        selectedVoltages={selectedVoltages}
        setSelectedVoltages={setSelectedVoltages}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="relative flex-1">
        <MapView
          buses={visibleBuses}
          lines={visibleLines}
          onSelect={setSelected}
          theme={theme}
        />
        <StatsPanel buses={visibleBuses} manifest={manifest} />
        <Legend />
        <InfoPanel selected={selected} onClose={() => setSelected(null)} />
        {loading && (
          <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-white/95 px-3 py-1 text-xs text-slate-600 shadow dark:bg-slate-800/95 dark:text-slate-300">
            Loading grid data…
          </div>
        )}
        {error && (
          <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-red-100 px-3 py-1 text-xs text-red-800 shadow dark:bg-red-900/40 dark:text-red-200">
            Failed to load grid data
          </div>
        )}
      </main>
    </div>
  );
}
