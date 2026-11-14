import type { ReactNode } from "react";
import { BrandLockup } from "./brand";
import { SideRail } from "./side-rail";
import { TabBar } from "./tab-bar";

/**
 * The application frame: a side rail on wide screens, a bottom tab bar on
 * small ones, and a single content column sized for reading.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <SideRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <BrandLockup instanceId="top" />
        </header>
        <main
          id="content"
          className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6"
          style={{ paddingBottom: "calc(var(--tab-bar-height) + 1.5rem)" }}
        >
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}
