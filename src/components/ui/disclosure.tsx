"use client";

import { useId, useState, type ReactNode } from "react";

export type DisclosureProps = {
  /** The control's label, e.g. "How this is counted". */
  label: string;
  children: ReactNode;
};

/**
 * A small expandable explanation. Used for the "how this is calculated" notes
 * that every number on a progress screen must carry
 * (docs/VSHARES_DESIGN_SYSTEM.md principle 5).
 *
 * This is a client component, so an end-to-end test that expands it proves
 * hydration works under the Content-Security-Policy.
 */
export function Disclosure({ label, children }: DisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 text-sm font-semibold text-blue hover:text-white"
      >
        {label}
      </button>
      <div id={panelId} hidden={!open} className="mt-2 text-sm text-silver">
        {children}
      </div>
    </div>
  );
}
