import { useEffect, useMemo, useRef, useState } from "react";
import { CloseButton } from "./icons.jsx";

const COLUMNS = {
  bus: [
    { key: "name", label: "Name", get: (p) => p.name },
    { key: "island", label: "Island", get: (p) => p.island ?? "—" },
    { key: "v_nom", label: "kV", num: true, get: (p) => p.v_nom },
    { key: "p_mw", label: "Load MW", num: true, get: (p) => p.p_mw ?? 0 },
    { key: "gen_mw", label: "Gen MW", num: true, get: (p) => p.gen_mw ?? 0 },
    {
      key: "vm_pu",
      label: "V pu",
      num: true,
      get: (p) => (p.vm_pu == null ? null : p.vm_pu),
    },
  ],
  line: [
    { key: "from_bus", label: "From", get: (p) => p.from_bus },
    { key: "to_bus", label: "To", get: (p) => p.to_bus },
    { key: "voltage_kv", label: "kV", num: true, get: (p) => p.voltage_kv },
    {
      key: "loading_percent",
      label: "Loading %",
      num: true,
      get: (p) => (p.loading_percent == null ? null : p.loading_percent),
    },
    {
      key: "p_from_mw",
      label: "P MW",
      num: true,
      get: (p) => (p.p_from_mw == null ? null : p.p_from_mw),
    },
    {
      key: "is_submarine",
      label: "Submarine",
      get: (p) => (p.is_submarine ? "yes" : "no"),
    },
  ],
};

function fmt(v) {
  if (v == null) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
}

export default function DataTable({ buses, lines, onClose, onFocus }) {
  const [tab, setTab] = useState("bus");
  const [sort, setSort] = useState({ key: "name", dir: 1 });
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cols = COLUMNS[tab];

  const rows = useMemo(() => {
    const src = (tab === "bus" ? buses : lines)?.features ?? [];
    const col = cols.find((c) => c.key === sort.key) ?? cols[0];
    return [...src].sort((a, b) => {
      const x = col.get(a.properties);
      const y = col.get(b.properties);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (col.num) return (Number(x) - Number(y)) * sort.dir;
      return String(x).localeCompare(String(y)) * sort.dir;
    });
  }, [tab, buses, lines, cols, sort]);

  const setSorted = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));

  return (
    <div className="absolute inset-0 z-[1200] flex flex-col bg-white/95 backdrop-blur dark:bg-slate-900/95">
      <div
        role="dialog"
        aria-label="Grid data table"
        aria-modal="true"
        className="flex h-full flex-col p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1" role="tablist" aria-label="Data set">
            {[
              ["bus", `Buses (${buses?.features?.length ?? 0})`],
              ["line", `Lines (${lines?.features?.length ?? 0})`],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  setSort({
                    key: COLUMNS[id][0].key,
                    dir: 1,
                  });
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  tab === id
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <CloseButton
            ref={closeRef}
            onClick={onClose}
            label="Close data table"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
              <tr>
                {cols.map((c) => {
                  const activeSort = sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={
                        activeSort
                          ? sort.dir === 1
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="border-b border-slate-200 p-0 text-left dark:border-slate-700"
                    >
                      <button
                        onClick={() => setSorted(c.key)}
                        className="flex w-full items-center gap-1 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        {c.label}
                        <span className="text-[9px] text-slate-400">
                          {activeSort ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr
                  key={i}
                  onClick={() => onFocus(f, tab)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onFocus(f, tab);
                  }}
                  className="cursor-pointer border-b border-slate-100 last:border-0 odd:bg-slate-50/40 hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none dark:border-slate-800 dark:odd:bg-slate-800/30 dark:hover:bg-sky-950"
                >
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-1.5 ${
                        c.num
                          ? "text-right tabular-nums text-slate-700 dark:text-slate-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {fmt(c.get(f.properties))}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={cols.length}
                    className="p-6 text-center text-slate-500 dark:text-slate-400"
                  >
                    No rows match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          Showing the currently filtered data · click a row to locate it on
          the map · Esc to close
        </p>
      </div>
    </div>
  );
}
