"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { DEMO_MODE_COOKIE } from "@/lib/demo";

type DemoModeLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function DemoModeLink({ href, children, variant = "primary", className }: DemoModeLinkProps) {
  const router = useRouter();

  function handleClick() {
    document.cookie = `${DEMO_MODE_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    router.push(href);
  }

  return (
    <Button type="button" variant={variant} onClick={handleClick} className={className}>
      {children}
    </Button>
  );
}
