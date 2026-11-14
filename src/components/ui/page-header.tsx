import type { ReactNode } from "react";

export type PageHeaderProps = {
  /** Small label above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-[0.2em] text-gold uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-3xl text-white sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl text-silver">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
