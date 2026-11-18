import type { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export type TextAreaProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className">;

/**
 * A labelled multi-line input. Mirrors TextField: the label is always
 * visible, and the hint and error are announced with the field.
 */
export function TextArea({ id, label, hint, error, className, rows = 4, ...rest }: TextAreaProps) {
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
      <textarea
        id={id}
        rows={rows}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "rounded-[var(--radius-control)] border bg-raised px-3 py-2 text-text",
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
