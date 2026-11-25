import { describe, expect, it } from "vitest";
import {
  assessCredibility,
  classifyTrend,
  computeMomentum,
  normalizeTrends,
  planCurriculum,
  proposeTrend,
  runTai,
  type CoverageGap,
  type SourceClass,
  type TrendProposal,
} from "@/factory";
import {
  CLASSIFY_RULES,
  DEMO_NOW,
  DEMO_OBSERVATIONS_A,
  DEMO_OBSERVATIONS_B,
  fixtureAdapter,
} from "@/factory/fixtures";

const opts = { now: DEMO_NOW };
const classBySource: Record<string, SourceClass> = {
  "fixture-official": "official",
  "fixture-institution": "institution",
};

function trendByKey(key: string) {
  const t = normalizeTrends([...DEMO_OBSERVATIONS_A, ...DEMO_OBSERVATIONS_B]).find((x) => x.key === key);
  if (!t) throw new Error(`no trend ${key}`);
  return t;
}

describe("category classification", () => {
  it("maps a security term to the right taxonomy topic", () => {
    const c = classifyTrend(trendByKey("passkey"), CLASSIFY_RULES);
    expect(c.status).toBe("classified");
    expect(c.category).toBe("technology-and-ai");
    expect(c.topic).toBe("security-basics");
  });
  it("leaves an unknown term unclassified", () => {
    const c = classifyTrend(trendByKey("quantum widget"), CLASSIFY_RULES);
    expect(c.status).toBe("unclassified");
  });
});

describe("momentum from real observations", () => {
  it("returns INSUFFICIENT_DATA below the observation/source thresholds", () => {
    const m = computeMomentum(trendByKey("ai study tool"), opts); // 2 obs / 2 sources, < 4 obs
    expect(m.status).toBe("insufficient_data");
  });
  it("computes momentum when there are enough multi-source observations", () => {
    const m = computeMomentum(trendByKey("passkey"), opts); // 4 obs / 2 sources
    expect(m.status).toBe("ok");
    expect(m.momentum).toBeGreaterThan(0);
  });
  it("never invents momentum for a single-source trend", () => {
    const m = computeMomentum(trendByKey("quantum widget"), opts);
    expect(m.status).toBe("insufficient_data");
    expect(m.distinctSources).toBe(1);
  });
});

describe("credibility and source disagreement", () => {
  it("reports mixed credibility when sources of different classes agree", () => {
    expect(assessCredibility(trendByKey("passkey"), classBySource)).toBe("mixed");
  });
});

describe("trend proposals, freshness and expiry", () => {
  it("proposes a classified, multi-source, current trend", () => {
    const p = proposeTrend(trendByKey("passkey"), CLASSIFY_RULES, classBySource, opts);
    expect(p.status).toBe("proposed");
    expect(p.expired).toBe(false);
    expect(p.category).toBe("technology-and-ai");
  });
  it("marks a stale, single-source, unclassified trend as expired and not proposable", () => {
    const p = proposeTrend(trendByKey("quantum widget"), CLASSIFY_RULES, classBySource, opts);
    expect(p.expired).toBe(true);
    expect(p.status).not.toBe("proposed");
  });
});

describe("runTai orchestration", () => {
  it("reports no live source connected for fixture adapters and is deterministic", async () => {
    const adapters = [
      fixtureAdapter("fixture-official", "official", DEMO_OBSERVATIONS_A),
      fixtureAdapter("fixture-institution", "institution", DEMO_OBSERVATIONS_B),
    ];
    const a = await runTai(adapters, CLASSIFY_RULES, opts);
    const b = await runTai(adapters, CLASSIFY_RULES, opts);
    expect(a).toEqual(b);
    expect(a.liveDataConnected).toBe(false);
    expect(a.note).toMatch(/NO LIVE TREND SOURCE CONNECTED/);
    const passkey = a.proposals.find((p) => p.key === "passkey");
    expect(passkey?.status).toBe("proposed");
  });
});

describe("curriculum planner — trends never displace essentials", () => {
  const gaps: CoverageGap[] = [
    { category: "personal-finance", topic: "budgeting", level: "beginner", deficit: 5, essential: true },
    { category: "health-and-wellbeing", topic: "sleep", level: "beginner", deficit: 4, essential: true },
    { category: "technology-and-ai", topic: "ai-foundations", level: "beginner", deficit: 2, essential: false },
  ];
  const hotTrend: TrendProposal = {
    key: "passkey",
    display: "passkeys",
    category: "technology-and-ai",
    topic: "security-basics",
    momentum: { key: "passkey", status: "ok", observationCount: 9, distinctSources: 3, momentum: 999, reason: "hot" },
    credibility: "mixed",
    educationalValue: 1,
    firstSeen: DEMO_NOW,
    lastSeen: DEMO_NOW,
    expiresAt: "2099-01-01T00:00:00Z",
    expired: false,
    status: "proposed",
    reasons: [],
  };

  it("places every essential before any trend and caps trend slots", () => {
    const plan = planCurriculum(gaps, [hotTrend, { ...hotTrend, key: "x", topic: "working-with-ai-tools" }], {
      batchSize: 4,
      evergreenFloor: 0.7,
    });
    const essentialSlots = plan.slots.filter((s) => s.kind === "evergreen" && s.rationale.includes("essential"));
    const trendSlots = plan.slots.filter((s) => s.kind === "trend");
    expect(essentialSlots.length).toBe(2); // both essentials placed
    expect(trendSlots.length).toBeLessThanOrEqual(plan.trendCapacity); // trend never exceeds its cap
    // essentials come first (lower priority numbers than any trend)
    const maxEssential = Math.max(...essentialSlots.map((s) => s.priority));
    const minTrend = trendSlots.length ? Math.min(...trendSlots.map((s) => s.priority)) : Infinity;
    expect(maxEssential).toBeLessThan(minTrend);
  });
});
