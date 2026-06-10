"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Themed dropdown that replaces the native <select> so the menu matches the
 * site instead of the OS. Two modes:
 *  - form mode: pass `name`; a hidden input carries the value so it submits
 *    with a normal (even no-JS GET) form.
 *  - controlled mode: pass `value` + `onValueChange` (e.g. the stage picker).
 */
export function Select({
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  ariaLabel,
  disabled,
  className,
}: {
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const current = controlled ? value : internal;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(v: string) {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  }

  const selectedLabel =
    options.find((o) => o.value === current)?.label ?? options[0]?.label ?? "";

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="border-border focus:border-primary aria-expanded:border-primary flex w-full items-center justify-between gap-2 rounded-xl border-2 bg-white px-3 py-2 text-left text-sm outline-none transition-colors disabled:opacity-50"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`text-muted h-4 w-4 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="border-border absolute left-0 z-30 mt-1.5 max-h-64 w-full min-w-max overflow-auto rounded-xl border-2 bg-white p-1.5 shadow-lg"
        >
          {options.map((o) => {
            const active = o.value === current;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => choose(o.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-primary/5"
                  }`}
                >
                  {o.label}
                  {active && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    >
                      <path
                        d="M5 10l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
