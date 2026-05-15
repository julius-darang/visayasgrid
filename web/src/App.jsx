import { useMemo, useState } from "react";
import MapView from "./components/MapView.jsx";
import Sidebar from "./components/Sidebar.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import Legend from "./components/Legend.jsx";
import { useGridData, filterFeatures } from "./hooks/useGridData.js";
import { ISLANDS, VOLTAGE_LEVELS } from "./lib/styles.js";

export default function App() {
  const { buses, lines, loading, error } = useGridData();
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
    <div className="flex h-full w-full">
      <Sidebar
        selectedIslands={selectedIslands}
        setSelectedIslands={setSelectedIslands}
        selectedVoltages={selectedVoltages}
        setSelectedVoltages={setSelectedVoltages}
      />
      <main className="relative flex-1">
        <MapView
          buses={visibleBuses}
          lines={visibleLines}
          onSelect={setSelected}
        />
        <Legend />
        <InfoPanel selected={selected} onClose={() => setSelected(null)} />
        {loading && (
          <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-white/90 px-3 py-1 text-xs shadow">
            Loading grid data…
          </div>
        )}
        {error && (
          <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-red-100 px-3 py-1 text-xs text-red-800 shadow">
            Failed to load grid data
          </div>
        )}
      </main>
    </div>
  );
}
