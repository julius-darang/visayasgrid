import { useMemo, useState } from "react";
import { ISLANDS, VOLTAGE_LEVELS, VOLTAGE_COLORS } from "../lib/styles.js";

function toggle(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return [...next];
}

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      className="transition-transform duration-150 group-open:rotate-180"
    >
      <path
        d="M2 4l3 3 3-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Collapsible section: keeps the sidebar uncluttered while the summary
// (e.g. "6 / 8") still shows state at a glance.
function Disclosure({ title, summary, defaultOpen = false, children }) {
  return (
    <details className="group mb-4" {...(defaultOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer select-none items-center justify-between rounded py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 marker:hidden focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-500">
        <span>{title}</span>
        <span className="flex items-center gap-1.5 normal-case tracking-normal">
          {summary != null && <span>{summary}</span>}
          <Chevron />
        </span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function AllNone({ onAll, onNone }) {
  return (
    <div className="mb-1 flex gap-3 text-[10px] text-sky-600 dark:text-sky-400">
      <button
        onClick={onAll}
        className="rounded hover:underline focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        All
      </button>
      <button
        onClick={onNone}
        className="rounded hover:underline focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        None
      </button>
    </div>
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
  colorMode,
  setColorMode,
  display,
  setDisplay,
  buses,
  onPick,
  onReset,
  theme,
  onToggleTheme,
  open,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (buses?.features ?? [])
      .filter((f) => String(f.properties.name).toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, buses]);

  return (
    <nav
      aria-label="Grid filters"
      className={`fixed inset-y-0 left-0 z-[1100] flex w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900 md:static md:z-auto md:translate-x-0 ${
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
        <label className="relative block">
          <span className="sr-only">Find a bus</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a bus…"
            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {results.map((f) => (
                <li key={f.properties.name}>
                  <button
                    onClick={() => {
                      onPick(f, "bus");
                      setQuery("");
                    }}
                    className="block w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {f.properties.name}
                    <span className="ml-1 text-slate-400">
                      {f.properties.v_nom} kV
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      </div>

      <Disclosure
        title="Display"
        summary={colorMode === "pu" ? "Voltage (pu)" : "Nominal kV"}
      >
        <div className="mb-3">
          <div className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">
            Colour buses by
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              ["nominal", "Nominal kV"],
              ["pu", "Voltage (pu)"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setColorMode(mode)}
                aria-pressed={colorMode === mode}
                className={`rounded-md border px-2 py-1.5 text-xs transition focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  colorMode === mode
                    ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            Voltage (pu) shows AC load-flow results only.
          </p>
        </div>
        <div className="space-y-0.5">
          {[
            ["labels", "Bus labels"],
            ["arrows", "Flow arrows"],
            ["rings", "Generator rings"],
          ].map(([key, label]) => (
            <label key={key} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={display[key]}
                onChange={() =>
                  setDisplay({ ...display, [key]: !display[key] })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Disclosure>

      <Disclosure
        title="Islands"
        summary={`${selectedIslands.length} / ${ISLANDS.length}`}
        defaultOpen
      >
        <AllNone
          onAll={() => setSelectedIslands(ISLANDS)}
          onNone={() => setSelectedIslands([])}
        />
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
      </Disclosure>

      <Disclosure
        title="Voltage"
        summary={`${selectedVoltages.length} / ${VOLTAGE_LEVELS.length}`}
        defaultOpen
      >
        <AllNone
          onAll={() => setSelectedVoltages(VOLTAGE_LEVELS)}
          onNone={() => setSelectedVoltages([])}
        />
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
      </Disclosure>

      <div className="mt-auto space-y-2 pt-4">
        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-2 text-xs text-slate-600 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 md:py-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M11.3 5A4.6 4.6 0 1 0 12 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M11.5 2v3h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Reset view</span>
        </button>
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
