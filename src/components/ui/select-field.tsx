import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className">;

/**
 * A labelled native select. Native on purpose: it is accessible and
 * keyboard-operable with no JavaScript, which a custom widget would have to
 * re-earn (docs/VSHARES_DECISIONS.md D-031).
 */
export function SelectField({
  id,
  label,
  hint,
  error,
  options,
  className,
  ...rest
}: SelectFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-silver-dim">
          {hint}
        </p>
      ) : null}
      <select
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "min-h-11 rounded-[var(--radius-control)] border bg-raised px-3 text-text",
          error ? "border-danger" : "border-border-strong",
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
