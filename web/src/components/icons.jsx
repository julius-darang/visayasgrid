import { forwardRef } from "react";

// Shared UI primitives so the chevron and close affordances stay
// visually and behaviourally consistent across every panel.

// Disclosure chevron. Rotates when the enclosing `.group` <details> is
// open. Pass a className to target a named group (e.g. group-open/more).
export function Chevron({
  className = "transition-transform duration-150 group-open:rotate-180",
}) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      className={className}
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
  );
}

// Consistent icon close button with a focus-visible ring. forwardRef so
// dialogs can move focus to it on open.
export const CloseButton = forwardRef(function CloseButton(
  { onClick, label = "Close", className = "" },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${className}`}
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
  );
});
