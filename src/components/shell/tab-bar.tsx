"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./navigation";
import { cn } from "../ui/cn";

/**
 * Bottom navigation on small screens. Labels are always visible, and the
 * active tab is marked by text weight and aria-current as well as colour, so
 * meaning is never carried by colour alone.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[var(--tab-bar-height)] flex-col items-center justify-center gap-1 px-1 text-xs",
                  active ? "font-bold text-gold" : "font-medium text-silver-dim",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("h-0.5 w-6 rounded-full", active ? "bg-gold" : "bg-transparent")}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
