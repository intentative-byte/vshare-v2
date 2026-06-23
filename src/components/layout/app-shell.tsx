"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Home, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClientSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-black/80 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/feed" className="text-lg font-black tracking-tight text-[var(--gold)]">
            VShare
          </Link>
          <Button variant="ghost" className="min-h-9 px-3" onClick={signOut} aria-label="Sign out">
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_1fr] lg:py-8">
        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] rounded-[2rem] border border-[var(--border)] bg-black/55 p-5 backdrop-blur lg:block">
          <Link href="/feed" className="block text-3xl font-black tracking-tight text-[var(--gold)]">
            VShare
          </Link>
          <p className="mt-2 text-sm text-[var(--muted)]">Topic memory. Faster learning. Less repeat content.</p>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-[var(--gold)] text-black"
                      : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button variant="secondary" className="mt-8 w-full" onClick={signOut}>
            <LogOut size={17} />
            Sign out
          </Button>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-black/90 px-3 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition",
                  active ? "bg-[var(--gold)] text-black" : "text-[var(--muted)]"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
