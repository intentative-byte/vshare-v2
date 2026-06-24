import Link from "next/link";
import type { ReactNode } from "react";
import { Bookmark, Compass, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: UserRound },
];

type AppShellProps = {
  children: ReactNode;
  active?: "feed" | "explore" | "saved" | "profile";
};

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="min-h-screen bg-mist pb-24 text-ink md:pb-0">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/feed" className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-ink text-white">V</span>
            VShare
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.label.toLowerCase();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-ink",
                    isActive && "bg-ink text-white hover:bg-ink hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/80 bg-white/95 px-3 py-2 shadow-soft backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.label.toLowerCase();
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-black text-slate-500",
                  isActive && "bg-ink text-white",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
