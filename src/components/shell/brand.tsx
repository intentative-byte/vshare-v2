import Link from "next/link";
import { cn } from "../ui/cn";

/**
 * The VSHARES mark: an original chevron forming a V, in the brand gold,
 * paired with the wordmark. No third-party asset and no inherited artwork.
 * A commissioned logo can replace the mark without touching layout.
 */
export function BrandMark({ className, instanceId = "default" }: { className?: string; instanceId?: string }) {
  // The gradient needs an id that is unique on the page: the lockup is
  // rendered twice (side rail and mobile header), and a duplicate id makes
  // the second instance resolve to a hidden definition and paint nothing.
  const gradientId = `vshares-mark-${instanceId}`;

  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="VSHARES"
      className={cn("size-8", className)}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5CC6A" />
          <stop offset="55%" stopColor="#E8B84A" />
          <stop offset="100%" stopColor="#B8892B" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8" fill="#141416" stroke="#2A2A30" />
      {/* Outer stroke of the V: attention coming in. */}
      <path
        d="M7 9.5 L16 23.5 L25 9.5"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner ascending stroke: value compounding out. */}
      <path
        d="M16 17 L21.5 8"
        fill="none"
        stroke="#F5F2E8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function BrandLockup({
  href = "/",
  className,
  instanceId = "default",
}: {
  href?: string;
  className?: string;
  instanceId?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark instanceId={instanceId} />
      <span className="font-display text-lg font-bold tracking-[0.14em] text-white">VSHARES</span>
    </Link>
  );
}
