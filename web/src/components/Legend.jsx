import {
  VOLTAGE_LEVELS,
  VOLTAGE_COLORS,
  CARRIER_COLORS,
  CARRIER_LIST,
  LOADING_SCALE,
  VM_PU_SCALE,
} from "../lib/styles.js";

function SubHeader({ children, active }) {
  return (
    <div
      className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${
        active
          ? "text-sky-600 dark:text-sky-400"
          : "text-slate-400 dark:text-slate-500"
      }`}
    >
      {children}
      {active && <span className="ml-1 normal-case">• shown</span>}
    </div>
  );
}

export default function Legend({ colorMode = "nominal" }) {
  // Collapsed by default so the map stays the focus; the summary chip is
  // always available to expand the colour reference on demand.
  return (
    <div className="absolute bottom-4 left-4 z-[1000] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white/95 text-[11px] shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
      <details className="group">
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 marker:hidden focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-500">
          <span>Legend</span>
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
        </summary>
        <div className="grid grid-cols-1 gap-3 px-3 pb-3 pt-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div>
            <SubHeader active={colorMode === "nominal"}>Bus voltage</SubHeader>
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

          <div>
            <SubHeader active={colorMode === "pu"}>Voltage (pu)</SubHeader>
            <div className="space-y-0.5">
              {VM_PU_SCALE.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-slate-400 dark:text-slate-500">
              AC flow only
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
