import { ISLANDS, VOLTAGE_LEVELS, VOLTAGE_COLORS } from "../lib/styles.js";

function toggle(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return [...next];
}

function SectionHeader({ children }) {
  return (
    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </h2>
  );
}

export default function Sidebar({
  selectedIslands,
  setSelectedIslands,
  selectedVoltages,
  setSelectedVoltages,
  theme,
  onToggleTheme,
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6">
        <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Visayas Grid
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Transmission prototype
        </p>
      </div>

      <div className="mb-5">
        <SectionHeader>Islands</SectionHeader>
        <div className="space-y-0.5">
          {ISLANDS.map((island) => (
            <label
              key={island}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600"
                checked={selectedIslands.includes(island)}
                onChange={() =>
                  setSelectedIslands(toggle(selectedIslands, island))
                }
              />
              <span>{island}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <SectionHeader>Voltage</SectionHeader>
        <div className="space-y-0.5">
          {VOLTAGE_LEVELS.map((kv) => (
            <label
              key={kv}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600"
                checked={selectedVoltages.includes(kv)}
                onChange={() =>
                  setSelectedVoltages(toggle(selectedVoltages, kv))
                }
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: VOLTAGE_COLORS[kv] }}
              />
              <span>{kv} kV</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={onToggleTheme}
          className="flex w-full items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          <span>{theme === "dark" ? "Dark" : "Light"} theme</span>
          <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
        </button>
      </div>
    </aside>
  );
}
