/**
 * robots.txt fetching and compliance.
 *
 * Conservative by design: a robots.txt that cannot be read (403/5xx/parse
 * failure) is treated as DISALLOW, so we never crawl a source whose rules we
 * cannot see. A 404 (no robots.txt) means allow-all, per the standard.
 */
import type { HttpFetcher } from "./http";
import { HttpError } from "./http";

export type RobotsDecision = "allowed" | "disallowed" | "unavailable";

export interface RobotsResult {
  decision: RobotsDecision;
  reason: string;
  crawlDelaySeconds?: number;
}

interface Group {
  agents: string[];
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

export function parseRobots(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "disallow") current.disallow.push(value);
    else if (field === "allow") current.allow.push(value);
    else if (field === "crawl-delay") {
      const n = Number(value);
      if (!Number.isNaN(n)) current.crawlDelay = n;
    }
  }
  return groups;
}

function pathMatches(rule: string, path: string): boolean {
  if (rule === "") return false; // empty Disallow means allow-all
  // Support the common `*` wildcard and `$` end-anchor.
  const hasEnd = rule.endsWith("$");
  const core = hasEnd ? rule.slice(0, -1) : rule;
  const escaped = core.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp("^" + escaped + (hasEnd ? "$" : ""));
  return re.test(path);
}

/** Decide from parsed groups whether `path` is allowed for `ua`. */
export function robotsAllowsPath(groups: Group[], ua: string, path: string): { allowed: boolean; crawlDelay?: number } {
  const uaLower = ua.toLowerCase();
  // Prefer the most specific matching UA group; fall back to '*'.
  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && uaLower.includes(a)));
  const star = groups.find((g) => g.agents.includes("*"));
  const group = specific ?? star;
  if (!group) return { allowed: true };

  // Longest matching rule wins; Allow beats Disallow on a tie.
  let best: { allow: boolean; len: number } | null = null;
  for (const d of group.disallow) {
    if (pathMatches(d, path) && (!best || d.length > best.len)) best = { allow: false, len: d.length };
  }
  for (const a of group.allow) {
    if (pathMatches(a, path) && (!best || a.length >= best.len)) best = { allow: true, len: a.length };
  }
  return { allowed: best ? best.allow : true, crawlDelay: group.crawlDelay };
}

export async function checkRobots(fetcher: HttpFetcher, url: string, ua: string): Promise<RobotsResult> {
  let robotsUrl: string;
  let path: string;
  try {
    const u = new URL(url);
    robotsUrl = `${u.origin}/robots.txt`;
    path = u.pathname + (u.search || "");
  } catch {
    return { decision: "disallowed", reason: "invalid url" };
  }

  let res;
  try {
    res = await fetcher(robotsUrl, { timeoutMs: 10000 });
  } catch (err) {
    const kind = err instanceof HttpError ? err.kind : "network";
    return { decision: "unavailable", reason: `robots.txt ${kind}` };
  }

  if (res.status === 404) return { decision: "allowed", reason: "no robots.txt (404) — allow all" };
  if (res.status === 403 || res.status >= 500) {
    return { decision: "disallowed", reason: `robots.txt returned ${res.status}; treating as disallow` };
  }
  if (res.status !== 200) return { decision: "disallowed", reason: `robots.txt returned ${res.status}` };

  const groups = parseRobots(res.text);
  const { allowed, crawlDelay } = robotsAllowsPath(groups, ua, path);
  return {
    decision: allowed ? "allowed" : "disallowed",
    reason: allowed ? "allowed by robots.txt" : "disallowed by robots.txt rule",
    crawlDelaySeconds: crawlDelay,
  };
}
