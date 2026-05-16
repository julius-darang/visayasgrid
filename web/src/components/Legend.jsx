import { useEffect, useState } from "react";
import {
  VOLTAGE_LEVELS,
  VOLTAGE_COLORS,
  CARRIER_COLORS,
  CARRIER_LIST,
  LOADING_SCALE,
} from "../lib/styles.js";

function SubHeader({ children }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </div>
  );
}

export default function Legend() {
  // Expanded by default on desktop; collapsed on small screens so it does
  // not cover the map. Defaults to open during SSR-less first paint.
  const [open, setOpen] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e) => setOpen(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="absolute bottom-4 left-4 z-[1000] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white/95 text-[11px] shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
      <details
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
        className="group"
      >
        <summary className="cursor-pointer select-none rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 marker:hidden focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-500 md:hidden">
          Legend
        </summary>
        <div className="grid grid-cols-1 gap-3 px-3 pb-3 sm:grid-cols-3 sm:gap-4 md:pt-3">
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
      </details>
    </div>
  );
}
