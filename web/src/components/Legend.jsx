import { VOLTAGE_LEVELS, VOLTAGE_COLORS, CARRIER_COLORS, CARRIER_LIST } from "../lib/styles.js";

const LOADING_SCALE = [
  { label: "< 50%", color: "#2d6a4f" },
  { label: "50–80%", color: "#f4a261" },
  { label: "80–100%", color: "#e63946" },
  { label: "> 100%", color: "#9b2226" },
];

function SubHeader({ children }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </div>
  );
}

export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white/95 p-3 text-[11px] shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
      <div>
        <SubHeader>Bus voltage</SubHeader>
        <div className="space-y-0.5">
          {VOLTAGE_LEVELS.map((kv) => (
            <div key={kv} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: VOLTAGE_COLORS[kv] }}
              />
              <span>{kv} kV</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SubHeader>Line loading</SubHeader>
        <div className="space-y-0.5">
          {LOADING_SCALE.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-current" />
          <span>Submarine</span>
        </div>
      </div>

      <div>
        <SubHeader>Generator ring</SubHeader>
        <div className="space-y-0.5">
          {CARRIER_LIST.map((c) => (
            <div key={c} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border-2"
                style={{ borderColor: CARRIER_COLORS[c] }}
              />
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
