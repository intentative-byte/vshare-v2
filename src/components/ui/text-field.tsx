import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type TextFieldProps = {
  id: string;
  label: string;
  /** Guidance shown under the label; announced with the field. */
  hint?: string;
  /** Error text; announced with the field and marks it invalid. */
  error?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

/**
 * A labelled text input. The label is always visible: a placeholder is never
 * used as a label (docs/VSHARES_DESIGN_SYSTEM.md section 8).
 */
export function TextField({ id, label, hint, error, className, ...rest }: TextFieldProps) {
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
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "min-h-11 rounded-[var(--radius-control)] border bg-raised px-3 text-text",
          "placeholder:text-silver-dim",
          error ? "border-danger" : "border-border-strong",
        )}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
