/**
 * The five destinations, in the approved order.
 * PATH | LEARN | EXPLORE | SAVED | YOU
 *
 * Every entry has a real working route. What each one holds today, and what
 * it grows into, is in docs/VSHARES_MASTER_SPEC.md section B4.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Said to assistive technology in place of the bare label. */
  description: string;
};

export const navItems: NavItem[] = [
  { href: "/path", label: "Path", description: "Your next step and your progress" },
  { href: "/learn", label: "Learn", description: "Your value feed" },
  { href: "/explore", label: "Explore", description: "Categories and topics" },
  { href: "/saved", label: "Saved", description: "Your knowledge library" },
  { href: "/you", label: "You", description: "Profile, preferences and privacy" },
];

/** True when `pathname` is the item's route or a page beneath it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
