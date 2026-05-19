// Small circular "i" button used across panels to reveal a short
// plain-language explanation. Presentational only — the parent owns the
// open state and renders the description (linked via `controls`).
export default function InfoButton({
  controls,
  label,
  open,
  onToggle,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`About ${label}`}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${className}`}
    >
      i
    </button>
  );
}
