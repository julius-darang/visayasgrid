import { VOLTAGE_LEVELS, VOLTAGE_COLORS } from "../lib/styles.js";

const LOADING_SCALE = [
  { label: "< 50%", color: "#2d6a4f" },
  { label: "50–80%", color: "#f4a261" },
  { label: "80–100%", color: "#e63946" },
  { label: "> 100%", color: "#9b2226" },
];

export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow">
      <div className="mb-2 font-semibold text-slate-800">Voltage (bus)</div>
      <div className="mb-3 space-y-1">
        {VOLTAGE_LEVELS.map((kv) => (
          <div key={kv} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: VOLTAGE_COLORS[kv] }}
            />
            <span>{kv} kV</span>
          </div>
        ))}
      </div>
      <div className="mb-2 font-semibold text-slate-800">Line loading</div>
      <div className="space-y-1">
        {LOADING_SCALE.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block h-1 w-6"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-slate-600">
        <span className="inline-block h-1 w-6 border-t-2 border-dashed border-slate-700" />
        <span>Submarine cable</span>
      </div>
    </div>
  );
}
