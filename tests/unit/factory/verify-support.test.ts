import { describe, expect, it } from "vitest";
import { classifyClaimSupport, topPassages } from "@/factory/live/verify-support";

describe("classifyClaimSupport — honesty invariants", () => {
  it("never confers approval and is always textual-only", () => {
    for (const passages of [[], ["Adults need seven hours of sleep each night."]]) {
      const r = classifyClaimSupport("Adults need sleep.", passages);
      expect(r.confersApproval).toBe(false);
      expect(r.textualOnly).toBe(true);
    }
  });
});

describe("classifyClaimSupport — the five classes", () => {
  it("exact_support when the passage matches the claim's wording closely", () => {
    const r = classifyClaimSupport("A consistent wake time helps sleep.", [
      "A consistent wake time helps sleep more than a consistent bedtime.",
    ]);
    expect(r.supportClass).toBe("exact_support");
    expect(r.passage).toBeTruthy();
  });

  it("semantic_support for an accurate paraphrase (matches only after lemmatisation)", () => {
    const r = classifyClaimSupport("Budgeting helps people control spending.", [
      "A budget can help people control their spending habits.",
    ]);
    expect(r.supportClass).toBe("semantic_support");
    expect(r.rawOverlap).toBeLessThan(0.85);
    expect(r.lemmatisedOverlap).toBeGreaterThanOrEqual(0.85);
  });

  it("partial_support for an on-topic but incomplete overlap", () => {
    const r = classifyClaimSupport("Coffee cures anxiety.", [
      "Coffee can worsen anxiety for some people.",
    ]);
    expect(r.supportClass).toBe("partial_support");
    // High topical overlap must NOT be read as truth.
    expect(r.confersApproval).toBe(false);
  });

  it("insufficient_evidence when nothing overlaps the claim", () => {
    const r = classifyClaimSupport("The moon affects stock prices.", [
      "Compound interest grows savings over time.",
      "A budget tracks income and spending.",
    ]);
    expect(r.supportClass).toBe("insufficient_evidence");
  });

  it("insufficient_evidence when there are no passages", () => {
    expect(classifyClaimSupport("Anything at all.", []).supportClass).toBe("insufficient_evidence");
  });
});

describe("classifyClaimSupport — contradiction detection", () => {
  it("flags a negation polarity mismatch as a contradiction", () => {
    const r = classifyClaimSupport("Vaccines cause autism.", ["Vaccines do not cause autism."]);
    expect(r.supportClass).toBe("contradiction");
    expect(r.flags.negationMismatch).toBe(true);
  });

  it("flags a conflicting number as a contradiction, not support", () => {
    const r = classifyClaimSupport("Adults need 8 hours of sleep each night.", [
      "Adults need 7 hours of sleep each night.",
    ]);
    expect(r.supportClass).toBe("contradiction");
    expect(r.flags.numericConflict).toBe(true);
  });

  it("flags a conflicting date as a contradiction", () => {
    const r = classifyClaimSupport("The guidance was updated in 2024.", [
      "This guidance was last updated in 2019.",
    ]);
    expect(r.supportClass).toBe("contradiction");
    expect(r.flags.dateConflict).toBe(true);
  });
});

describe("classifyClaimSupport — misleading paraphrase is not treated as truth", () => {
  it("a misleading negated paraphrase is caught as a contradiction", () => {
    const r = classifyClaimSupport("Skipping breakfast helps weight loss.", [
      "Skipping breakfast does not help weight loss.",
    ]);
    expect(r.supportClass).toBe("contradiction");
  });

  it("an unconfirmed numeric claim is capped at partial_support, never exact", () => {
    // Same wording, but the passage does not state the number at all.
    const r = classifyClaimSupport("Walking 10000 steps improves fitness greatly.", [
      "Walking regularly improves fitness greatly over time.",
    ]);
    expect(["partial_support", "insufficient_evidence"]).toContain(r.supportClass);
    expect(r.supportClass).not.toBe("exact_support");
  });
});

describe("topPassages", () => {
  const passages = [
    "A budget is a plan for the money you have.",
    "Completely unrelated text about gardening.",
    "Writing fixed costs down helps you plan.",
  ];
  it("returns real excerpts ranked by overlap, highest first", () => {
    const top = topPassages("A budget is a plan for money you have.", passages, 2);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0]!.passage).toContain("budget");
    expect(top[0]!.overlap).toBeGreaterThanOrEqual(top[top.length - 1]!.overlap);
  });
  it("never invents a passage (only returns ones that overlap)", () => {
    const top = topPassages("quantum chromodynamics lattice gauge theory", passages, 2);
    expect(top).toHaveLength(0);
  });
});
