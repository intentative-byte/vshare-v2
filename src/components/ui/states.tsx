import type { ReactNode } from "react";
import { cn } from "./cn";
import { ButtonLink } from "./button";

/**
 * The states every data-driven view must define before it is considered done:
 * loading, empty, error. docs/VSHARES_DESIGN_SYSTEM.md section 5.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-[var(--radius-control)] bg-raised", className)}
    />
  );
}

/** Announces that content is loading, for assistive technology. */
export function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export type EmptyStateProps = {
  title: string;
  body: string;
  action?: { href: string; label: string };
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
      <h2 className="text-lg text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-silver">{body}</p>
      {action ? (
        <div className="mt-5 flex justify-center">
          <ButtonLink href={action.href}>{action.label}</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

export type ErrorStateProps = {
  title?: string;
  body?: string;
  children?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  body = "This did not load. Please try again.",
  children,
}: ErrorStateProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-danger/40 bg-surface p-8 text-center">
      <h2 className="text-lg text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-silver">{body}</p>
      {children ? <div className="mt-5 flex justify-center">{children}</div> : null}
    </div>
  );
}
