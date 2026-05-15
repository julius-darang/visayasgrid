export default function InfoPanel({ selected, onClose }) {
  if (!selected) return null;
  const { kind, feature } = selected;
  const props = feature.properties;

  return (
    <div className="absolute right-4 top-4 z-[1000] w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {kind}
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            {props.name ?? props.line_id ?? "—"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <dl className="space-y-1 text-xs text-slate-700">
        {Object.entries(props)
          .filter(([, v]) => v !== null && v !== "")
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="font-medium text-slate-500">{k}</dt>
              <dd className="text-right">{formatValue(v)}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

function formatValue(v) {
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  }
  return String(v);
}
