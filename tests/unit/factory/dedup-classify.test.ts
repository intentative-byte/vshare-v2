import { describe, expect, it } from "vitest";
import {
  classifyDuplicate,
  normalizeTitle,
  toCatalogueEntry,
  type CatalogueEntry,
} from "@/factory/dedup";

const CATALOGUE: CatalogueEntry[] = [
  { url: "https://www.nhs.uk/live-well/sleep-and-tiredness/", title: "How to get to sleep" },
  { url: "https://example.com/budget", title: "Make your first monthly budget" },
  { url: "https://example.org/compound-interest", title: "Understanding compound interest" },
];

describe("normalizeTitle", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    expect(normalizeTitle("  Make YOUR first, monthly   budget! ")).toBe("make your first monthly budget");
  });
});

describe("toCatalogueEntry", () => {
  it("reads a url from source.url, sourceUrl or url", () => {
    expect(toCatalogueEntry({ source: { url: "https://a/x" }, title: "t" })).toEqual({ url: "https://a/x", title: "t" });
    expect(toCatalogueEntry({ sourceUrl: "https://b/y" }).url).toBe("https://b/y");
    expect(toCatalogueEntry({ url: "https://c/z" }).url).toBe("https://c/z");
  });
});

describe("classifyDuplicate — exact URL collisions (certain, safe to skip)", () => {
  it("matches an identical URL", () => {
    const r = classifyDuplicate({ url: "https://example.com/budget", title: "Totally different title" }, CATALOGUE);
    expect(r.verdict).toBe("exact_duplicate");
    expect(r.matches[0]?.signal).toBe("normalized_url");
  });

  it("matches despite tracking params, trailing slash and case", () => {
    const r = classifyDuplicate(
      { url: "https://EXAMPLE.com/budget/?utm_source=x&gclid=y", title: "x" },
      CATALOGUE,
    );
    expect(r.verdict).toBe("exact_duplicate");
  });
});

describe("classifyDuplicate — near matches are flagged, never auto-discarded", () => {
  it("flags an identical normalised title on a different URL", () => {
    const r = classifyDuplicate(
      { url: "https://somewhere-else.test/post", title: "Make your first monthly budget!" },
      CATALOGUE,
    );
    expect(r.verdict).toBe("near_duplicate_review");
    expect(r.matches[0]?.signal).toBe("normalized_title");
    expect(r.nearest).toBe(1);
    // It is NOT an exact duplicate, so it is not dropped automatically.
    expect(r.verdict).not.toBe("exact_duplicate");
  });

  it("flags a strong title near-duplicate (>= 0.8) on a different URL", () => {
    // "Make your first monthly budget" (5 tokens) vs this (6 tokens, 5 shared) = 0.83.
    const r = classifyDuplicate(
      { url: "https://new.test/a", title: "Make your first monthly budget plan" },
      CATALOGUE,
    );
    expect(r.verdict).toBe("near_duplicate_review");
    expect(r.reason).toMatch(/strong/);
    expect(r.nearest).toBeGreaterThanOrEqual(0.8);
    expect(r.matches[0]?.signal).toBe("title_similarity");
  });

  it("still flags a medium near-duplicate (>= review band) for a human", () => {
    // "Understanding compound interest basics" vs "Understanding compound interest" = 0.75.
    const r = classifyDuplicate(
      { url: "https://new.test/b", title: "Understanding compound interest basics" },
      CATALOGUE,
    );
    expect(r.verdict).toBe("near_duplicate_review");
    expect(r.reason).toMatch(/possible/);
    expect(r.nearest).toBeGreaterThanOrEqual(0.6);
    expect(r.nearest).toBeLessThan(0.8);
    expect(r.matches.length).toBeGreaterThan(0);
  });
});

describe("classifyDuplicate — unique", () => {
  it("returns unique for an unrelated candidate", () => {
    const r = classifyDuplicate(
      { url: "https://fresh.test/topic", title: "A completely unrelated subject about gardening" },
      CATALOGUE,
    );
    expect(r.verdict).toBe("unique");
    expect(r.matches).toHaveLength(0);
  });

  it("returns unique against an empty catalogue", () => {
    expect(classifyDuplicate({ url: "https://x/y", title: "anything" }, []).verdict).toBe("unique");
  });

  it("does not match on title when the candidate has no title", () => {
    const r = classifyDuplicate({ url: "https://fresh.test/notitle" }, CATALOGUE);
    expect(r.verdict).toBe("unique");
    expect(r.nearest).toBe(0);
  });
});
