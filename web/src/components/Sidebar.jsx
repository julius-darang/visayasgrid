import { ISLANDS, VOLTAGE_LEVELS, VOLTAGE_COLORS } from "../lib/styles.js";

function toggle(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return [...next];
}

export default function Sidebar({
  selectedIslands,
  setSelectedIslands,
  selectedVoltages,
  setSelectedVoltages,
}) {
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        Visayas Grid
      </h1>
      <p className="mb-6 text-xs text-slate-500">
        Transmission grid prototype
      </p>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Islands
      </h2>
      <div className="mb-6 space-y-1">
        {ISLANDS.map((island) => (
          <label key={island} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedIslands.includes(island)}
              onChange={() =>
                setSelectedIslands(toggle(selectedIslands, island))
              }
            />
            <span>{island}</span>
          </label>
        ))}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Voltage
      </h2>
      <div className="space-y-1">
        {VOLTAGE_LEVELS.map((kv) => (
          <label key={kv} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedVoltages.includes(kv)}
              onChange={() =>
                setSelectedVoltages(toggle(selectedVoltages, kv))
              }
            />
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: VOLTAGE_COLORS[kv] }}
            />
            <span>{kv} kV</span>
          </label>
        ))}
      </div>
    </aside>
  );
}
