import { overloadedLines, voltageViolations } from "../lib/grid.js";
import { Chevron } from "./icons.jsx";
import { usePersistentState } from "../hooks/usePersistentState.js";

function sum(features, field) {
  return features.reduce((s, f) => s + Number(f.properties[field] || 0), 0);
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return null;
  }
}

const WRAP =
  "absolute left-16 top-4 z-[1000] w-[min(14rem,calc(100vw-5rem))] rounded-lg border border-slate-200 bg-white/95 text-xs shadow-sm backdrop-blur animate-fade-in dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 md:left-4 md:w-56";

export default function StatsPanel({ buses, lines, manifest, onFocus }) {
  // Hook must be called before any early returns (React rules).
  const [panelOpen, setPanelOpen] = usePersistentState("vg-stats-open", false);

  const features = buses.features;
  if (!features.length) {
    return (
      <div className={`${WRAP} px-3 py-2`}>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Visayas snapshot
        </div>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          No buses match the current filters.
        </p>
      </div>
    );
  }

  const totalLoad = sum(features, "p_mw");
  const totalGen = sum(features, "gen_mw");
  const totalCap = sum(features, "gen_capacity_mw");
  const net = totalGen - totalLoad;

  // HVDC import from the slack (Ormoc) bus property — set by build_data.py.
  const hvdcBus = features.find((f) => f.properties.bus_type === "hvdc");
  const hvdcMw = hvdcBus?.properties?.hvdc_import_mw ?? null;

  const byIsland = {};
  for (const f of features) {
    const i = f.properties.island ?? "—";
    if (!byIsland[i]) byIsland[i] = { load: 0, gen: 0 };
    byIsland[i].load += Number(f.properties.p_mw || 0);
    byIsland[i].gen += Number(f.properties.gen_mw || 0);
  }

  const snapshotDate = formatDate(manifest?.generated_at);

  const overloaded = overloadedLines(lines);
  const violations = voltageViolations(buses);
  const alertCount = overloaded.length + violations.length;

  return (
    <div className={WRAP}>
      <details
        className="group"
        open={panelOpen}
        onToggle={(e) => setPanelOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 marker:hidden focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-500">
          <span>Visayas snapshot</span>
          {alertCount > 0 && (
            <span
              className="rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold tabular-nums text-rose-700 dark:bg-rose-950 dark:text-rose-400"
              title={`${alertCount} alert${alertCount > 1 ? "s" : ""}`}
            >
              {alertCount}
            </span>
          )}
          <span className="ml-auto">
            <Chevron />
          </span>
        </summary>

        <div className="px-3 pb-3 pt-1">
          {/* Headline only — Demand + Net. Secondary figures live under
              "More detail" so the panel stays scannable at a glance.
              Net uses emerald/rose (balance scale), deliberately distinct
              from the line-loading colour scale. */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-slate-500 dark:text-slate-400">Demand</span>
            <span className="text-right font-semibold tabular-nums">{totalLoad.toFixed(0)} MW</span>
            <span className="text-slate-500 dark:text-slate-400">Net</span>
            <span
              className={`text-right font-semibold tabular-nums ${
                net >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400"
              }`}
            >
              {net >= 0 ? "+" : ""}{net.toFixed(0)} MW
            </span>
          </div>

          {alertCount > 0 && (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
              {overloaded.length > 0 && (
                <button
                  onClick={() => onFocus(overloaded[0], "line")}
                  className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left text-rose-700 transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950"
                >
                  <span>Overloaded lines</span>
                  <span className="font-semibold tabular-nums">
                    {overloaded.length} ›
                  </span>
                </button>
              )}
              {violations.length > 0 && (
                <button
                  onClick={() => onFocus(violations[0], "bus")}
                  className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left text-rose-700 transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950"
                >
                  <span>Voltage violations</span>
                  <span className="font-semibold tabular-nums">
                    {violations.length} ›
                  </span>
                </button>
              )}
            </div>
          )}

          <details className="group/more mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <summary className="flex cursor-pointer select-none items-center justify-between rounded text-[10px] uppercase tracking-wider text-slate-400 transition marker:hidden hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-500 dark:hover:text-slate-300">
              <span>More detail</span>
              <Chevron className="transition-transform duration-150 group-open/more:rotate-180" />
            </summary>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-slate-500 dark:text-slate-400">Dispatched</span>
              <span className="text-right font-semibold tabular-nums">{totalGen.toFixed(0)} MW</span>
              <span className="text-slate-500 dark:text-slate-400">Capacity</span>
              <span className="text-right tabular-nums text-slate-600 dark:text-slate-300">{totalCap.toFixed(0)} MW</span>
              {hvdcMw !== null && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">HVDC link</span>
                  <span
                    className={`text-right font-semibold tabular-nums ${
                      hvdcMw >= 0
                        ? "text-violet-700 dark:text-violet-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                    title={hvdcMw >= 0 ? "Importing from Luzon" : "Exporting to Luzon"}
                  >
                    {hvdcMw >= 0 ? "+" : ""}{hvdcMw.toFixed(0)} MW
                  </span>
                </>
              )}
            </div>

            <table className="mt-2 w-full text-[11px]">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500">
                  <th className="text-left font-normal">Island</th>
                  <th className="text-right font-normal">Load</th>
                  <th className="text-right font-normal">Gen</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byIsland)
                  .sort((a, b) => b[1].gen - a[1].gen)
                  .map(([island, v]) => (
                    <tr key={island}>
                      <td className="text-slate-700 dark:text-slate-300">{island}</td>
                      <td className="text-right tabular-nums">{v.load.toFixed(0)}</td>
                      <td className="text-right tabular-nums">{v.gen.toFixed(0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>

          {snapshotDate && (
            <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-600">
              {manifest?.power_flow_mode ?? "DC"} flow · {snapshotDate}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
