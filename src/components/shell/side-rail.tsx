"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./navigation";
import { BrandLockup } from "./brand";
import { cn } from "../ui/cn";

/** Left navigation on wider screens. Same five destinations as the tab bar. */
export function SideRail() {
  const pathname = usePathname();

  return (
    <div className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="px-5 py-5">
        <BrandLockup instanceId="rail" />
      </div>
      <nav aria-label="Main" className="px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm",
                    active
                      ? "bg-raised font-bold text-gold"
                      : "font-medium text-silver hover:bg-raised hover:text-white",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("h-5 w-0.5 rounded-full", active ? "bg-gold" : "bg-border-strong")}
                  />
                  <span>
                    {item.label}
                    <span className="block text-xs font-normal text-silver-dim">{item.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
