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

export default function StatsPanel({ buses, manifest }) {
  const features = buses.features;
  if (!features.length) return null;

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

  return (
    <div className="absolute left-4 top-4 z-[1000] w-56 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Visayas snapshot
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <span className="text-slate-500 dark:text-slate-400">Demand</span>
        <span className="text-right font-semibold tabular-nums">{totalLoad.toFixed(0)} MW</span>
        <span className="text-slate-500 dark:text-slate-400">Dispatched</span>
        <span className="text-right font-semibold tabular-nums">{totalGen.toFixed(0)} MW</span>
        <span className="text-slate-500 dark:text-slate-400">Capacity</span>
        <span className="text-right tabular-nums text-slate-600 dark:text-slate-300">{totalCap.toFixed(0)} MW</span>
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

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
          By island
        </summary>
        <table className="mt-1.5 w-full text-[11px]">
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
          DC flow · {snapshotDate}
        </div>
      )}
    </div>
  );
}
