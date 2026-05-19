import { useState } from "react";
import {
  VOLTAGE_LEVELS,
  VOLTAGE_COLORS,
  CARRIER_COLORS,
  CARRIER_LIST,
  LOADING_SCALE,
  VM_PU_SCALE,
} from "../lib/styles.js";
import InfoButton from "./InfoButton.jsx";

const LEGEND_INFO = {
  voltage:
    "Fill colour of each bus by its nominal voltage level (kV). Active when “Colour buses by → Nominal kV”.",
  loading:
    "Line colour by loading: power flow as a percentage of the line’s thermal rating. Over 100% means overloaded.",
  carrier:
    "Ring around buses that have generation; the ring colour is the primary fuel type at that bus.",
  vmpu:
    "Fill colour by per-unit voltage from the AC load flow. Outside 0.95–1.05 pu is a violation. Active when “Colour buses by → Voltage (pu)”.",
};

function Cat({ id, title, active, info, open, onToggle, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            active
              ? "text-sky-600 dark:text-sky-400"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {title}
          {active && <span className="ml-1 normal-case">• shown</span>}
        </span>
        <InfoButton
          controls={id}
          label={title}
          open={open}
          onToggle={onToggle}
        />
      </div>
      {open && (
        <p
          id={id}
          className="mb-1 border-l-2 border-slate-200 pl-2 text-[10px] leading-snug text-slate-500 dark:border-slate-700 dark:text-slate-400"
        >
          {info}
        </p>
      )}
      {children}
    </div>
  );
}

export default function Legend({
  colorMode = "nominal",
  selectedVoltages = [],
  onToggleVoltage,
}) {
  // Collapsed by default so the map stays the focus; the summary chip is
  // always available to expand the colour reference on demand.
  const [info, setInfo] = useState({});
  const toggle = (k) => setInfo((s) => ({ ...s, [k]: !s[k] }));

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
          <Cat
            id="legend-voltage"
            title="Bus voltage"
            active={colorMode === "nominal"}
            info={LEGEND_INFO.voltage}
            open={!!info.voltage}
            onToggle={() => toggle("voltage")}
          >
            <div className="space-y-0.5">
              {VOLTAGE_LEVELS.map((kv) => {
                const on = selectedVoltages.includes(kv);
                return (
                  <button
                    key={kv}
                    type="button"
                    onClick={() => onToggleVoltage?.(kv)}
                    aria-pressed={on}
                    title={
                      on
                        ? `Hide ${kv} kV buses`
                        : `Show ${kv} kV buses`
                    }
                    className={`flex w-full items-center gap-2 rounded px-1 text-left transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 ${
                      on ? "" : "opacity-40"
                    }`}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: VOLTAGE_COLORS[kv] }}
                    />
                    <span className={on ? "" : "line-through"}>{kv} kV</span>
                  </button>
                );
              })}
            </div>
          </Cat>

          <Cat
            id="legend-loading"
            title="Line loading"
            info={LEGEND_INFO.loading}
            open={!!info.loading}
            onToggle={() => toggle("loading")}
          >
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
          </Cat>

          <Cat
            id="legend-carrier"
            title="Generator ring"
            info={LEGEND_INFO.carrier}
            open={!!info.carrier}
            onToggle={() => toggle("carrier")}
          >
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
          </Cat>

          <Cat
            id="legend-vmpu"
            title="Voltage (pu)"
            active={colorMode === "pu"}
            info={LEGEND_INFO.vmpu}
            open={!!info.vmpu}
            onToggle={() => toggle("vmpu")}
          >
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
          </Cat>
        </div>
      </details>
    </div>
  );
}
