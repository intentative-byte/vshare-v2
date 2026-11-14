import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLockup } from "@/components/shell/brand";
import { isDatabaseConfigured } from "@/platform/env";
import { readViewer } from "@/modules/profiles";

export const metadata = { title: "Admin" };

const sections = [
  { href: "/admin/queue", label: "Moderation queue" },
  { href: "/admin/queue?status=published", label: "Published" },
];

/**
 * The administration area.
 *
 * This guard decides what is rendered, not what is permitted: every action
 * re-checks the caller's role on the server, and the database refuses the
 * write regardless. Someone who reached this layout without a role would
 * still be able to do nothing.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isDatabaseConfigured()) {
    notFound();
  }

  const viewer = await readViewer();
  const isStaff = viewer?.roles.includes("moderator") || viewer?.roles.includes("admin");

  // Not found rather than forbidden: an account without a role learns
  // nothing about whether this area exists.
  if (!isStaff) {
    notFound();
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <BrandLockup href="/admin/queue" instanceId="admin" />
          <nav aria-label="Admin" className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-silver hover:bg-raised hover:text-white"
              >
                {section.label}
              </Link>
            ))}
            <Link
              href="/learn"
              className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-silver hover:bg-raised hover:text-white"
            >
              Leave admin
            </Link>
          </nav>
        </div>
      </header>
      <main id="content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
