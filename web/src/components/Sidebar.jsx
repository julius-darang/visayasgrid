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

const checkboxClass =
  "h-4 w-4 rounded border-slate-300 text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-600";
const rowClass =
  "flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 md:py-0.5";

export default function Sidebar({
  selectedIslands,
  setSelectedIslands,
  selectedVoltages,
  setSelectedVoltages,
  theme,
  onToggleTheme,
  open,
  onClose,
}) {
  return (
    <nav
      aria-label="Grid filters"
      className={`fixed inset-y-0 left-0 z-[1100] flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900 md:static md:z-auto md:translate-x-0 ${
        open ? "translate-x-0 shadow-xl md:shadow-none" : "-translate-x-full"
      }`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Visayas Grid
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Transmission prototype
          </p>
        </div>
        <button
          onClick={onClose}
          className="-mr-1 -mt-1 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden"
          aria-label="Close filters"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="mb-5">
        <SectionHeader>Islands</SectionHeader>
        <div className="space-y-0.5">
          {ISLANDS.map((island) => (
            <label key={island} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
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
            <label key={kv} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
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
          className="flex w-full items-center justify-between rounded-md border border-slate-200 px-2.5 py-2 text-xs text-slate-600 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 md:py-1.5"
          aria-label="Toggle colour theme"
        >
          <span>{theme === "dark" ? "Dark" : "Light"} theme</span>
          <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
        </button>
      </div>
    </nav>
  );
}
