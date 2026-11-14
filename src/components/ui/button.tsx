import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold " +
  "transition-colors duration-150 ease-[var(--ease-standard)] " +
  "disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

const variants: Record<ButtonVariant, string> = {
  // Gold marks the single primary action on a screen.
  primary: "gradient-gold text-bg hover:brightness-110 active:brightness-95",
  secondary: "border border-border-strong bg-raised text-text hover:border-gold hover:text-white",
  ghost: "text-silver hover:bg-raised hover:text-white",
  danger: "border border-danger/60 bg-transparent text-danger hover:bg-danger/10",
};

const sizes: Record<ButtonSize, string> = {
  // Minimum 44px tall for touch.
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export type ButtonLinkProps = CommonProps & {
  href: string;
  prefetch?: boolean;
};

/** A link styled as a button. Navigation stays a link, so it behaves like one. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
