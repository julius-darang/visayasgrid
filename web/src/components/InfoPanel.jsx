import { useEffect, useRef } from "react";
import { colorForCarrier, HVDC_LINK } from "../lib/styles.js";

function formatNumber(v, digits = 2) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? n.toString() : n.toFixed(digits);
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-xs">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900 tabular-nums dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

function CarrierChips({ carriers }) {
  if (!carriers) return <span>—</span>;
  const items = String(carriers).split(",").filter(Boolean);
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {items.map((c) => (
        <span
          key={c}
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: colorForCarrier(c) }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function BusPanel({ p, manifest }) {
  const hvdc = manifest?.hvdc ?? {};
  const ratedMw = hvdc.rated_mw ?? HVDC_LINK.ratedMw;
  const linkLabel = hvdc.label ?? HVDC_LINK.label;
  const hasGen = (p.gen_capacity_mw || 0) > 0;
  const hasLoad = (p.p_mw || 0) > 0;
  const hasResults = p.vm_pu != null || p.va_degree != null;

  return (
    <>
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {p.name}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{p.v_nom} kV</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {p.island} · {p.bus_type}
      </div>

      {hasLoad && (
        <Section title="Load">
          <Row label="Demand">{formatNumber(p.p_mw, 1)} MW</Row>
          <Row label="Reactive">{formatNumber(p.q_mvar, 1)} MVAR</Row>
          <Row label="Feeders">{p.load_count ?? 0}</Row>
        </Section>
      )}

      {hasGen && (
        <Section title="Generation">
          <Row label="Dispatched">{formatNumber(p.gen_mw, 1)} MW</Row>
          <Row label="Capacity">{formatNumber(p.gen_capacity_mw, 1)} MW</Row>
          <Row label="Carriers">
            <CarrierChips carriers={p.gen_carriers} />
          </Row>
        </Section>
      )}

      {p.bus_type === "hvdc" && p.hvdc_import_mw != null && (
        <Section title="HVDC link">
          <Row label="Luzon interchange">
            {p.hvdc_import_mw >= 0
              ? `+${p.hvdc_import_mw.toFixed(0)} MW import`
              : `${p.hvdc_import_mw.toFixed(0)} MW export`}
          </Row>
          <Row label="Rated capacity">{ratedMw} MW</Row>
          <Row label="Role">{linkLabel}</Row>
        </Section>
      )}

      {hasResults && (
        <Section title="Flow">
          <Row label="Voltage">{formatNumber(p.vm_pu, 3)} pu</Row>
          <Row label="Angle">{formatNumber(p.va_degree, 2)}°</Row>
          {p.is_slack && <Row label="Role">slack bus</Row>}
        </Section>
      )}
    </>
  );
}

function LinePanel({ p }) {
  const direction = (p.p_from_mw ?? 0) >= 0 ? "→" : "←";
  return (
    <>
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {p.from_bus} {direction} {p.to_bus}
        </h2>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {p.voltage_kv} kV · {p.cable_type}
        {p.parallel > 1 ? ` · ${p.parallel}× parallel` : ""}
      </div>

      <Section title="Path">
        <Row label="Length">{formatNumber(p.length_km, 1)} km</Row>
        <Row label="Submarine">{p.is_submarine ? "yes" : "no"}</Row>
        <Row label="r">{formatNumber(p.r_ohm_per_km, 4)} Ω/km</Row>
        <Row label="x">{formatNumber(p.x_ohm_per_km, 4)} Ω/km</Row>
        <Row label="Imax">{formatNumber(p.max_i_ka, 3)} kA</Row>
      </Section>

      {p.loading_percent != null && (
        <Section title="Flow">
          <Row label="Loading">{formatNumber(p.loading_percent, 1)}%</Row>
          <Row label="Power">{formatNumber(p.p_from_mw, 1)} MW</Row>
          <Row label="Current">{formatNumber(p.i_from_ka, 3)} kA</Row>
        </Section>
      )}
    </>
  );
}

export default function InfoPanel({ selected, onClose, manifest }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!selected) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onClose]);

  if (!selected) return null;
  const { kind, feature } = selected;
  const p = feature.properties;

  return (
    <div
      role="dialog"
      aria-label={`${kind} details`}
      className="absolute inset-x-0 bottom-0 z-[1000] max-h-[70vh] animate-slide-up overflow-y-auto rounded-t-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-80 md:animate-fade-in md:rounded-lg md:shadow-sm"
    >
      <div className="mb-1 flex items-start justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {kind}
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          className="-mr-1 -mt-1 rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close details"
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
      {kind === "bus" ? (
        <BusPanel p={p} manifest={manifest} />
      ) : (
        <LinePanel p={p} />
      )}
    </div>
  );
}
