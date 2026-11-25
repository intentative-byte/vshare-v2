import type { ReactNode } from "react";
import { cn } from "./cn";

export type CardProps = {
  children: ReactNode;
  className?: string;
  /** Raises the surface for emphasis, without a heavy shadow. */
  emphasis?: boolean;
  as?: "div" | "article" | "section" | "li";
};

export function Card({ children, className, emphasis = false, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-card)] border p-5",
        emphasis ? "border-gold/30 bg-raised" : "border-border bg-surface",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-lg text-white", className)}>{children}</h2>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-silver", className)}>{children}</p>;
}
