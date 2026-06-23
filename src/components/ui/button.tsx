import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" &&
          "bg-[var(--gold)] text-black hover:bg-[var(--gold-strong)]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-white/5 text-[var(--foreground)] hover:bg-white/10",
        variant === "ghost" &&
          "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]",
        variant === "danger" && "bg-red-500/15 text-red-200 hover:bg-red-500/25",
        className
      )}
      {...props}
    />
  );
}
