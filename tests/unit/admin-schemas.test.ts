/**
 * The admin catalogue and taxonomy input contracts.
 *
 * The database functions enforce these rules too; the schema is the first of
 * two checks. These tests pin the shapes the admin forms depend on.
 */

import { describe, expect, it } from "vitest";
import {
  categoryInput,
  topicInput,
  createCardInput,
  cardVersionInput,
  archiveInput,
} from "@/modules/content/schemas";

const validCategory = {
  slug: "personal-finance",
  name: "Personal finance",
  description: "Making money work for what matters to you.",
  sortOrder: 3,
  isHighImpact: true,
};

const validCard = {
  slug: "a-good-card-slug",
  topicId: "11111111-2222-4333-8444-555555555555",
  sourceUrl: "https://example.com/resource",
  sourceName: "Example Publisher",
  title: "Something worth learning",
  summary: "A summary that is comfortably past the forty character minimum the schema requires.",
  takeaways: ["A takeaway long enough to count."],
  nextStep: "Do the thing it suggests.",
  format: "article" as const,
  level: "beginner" as const,
  estimatedMinutes: 8,
  qualityScore: 70,
  isAiAssisted: false,
};

describe("categoryInput", () => {
  it("accepts a well-formed category", () => {
    expect(categoryInput.safeParse(validCategory).success).toBe(true);
  });

  it("defaults sortOrder and isHighImpact", () => {
    const parsed = categoryInput.parse({
      slug: "a-slug-here",
      name: "Name",
      description: "A description that is long enough.",
    });
    expect(parsed.sortOrder).toBe(0);
    expect(parsed.isHighImpact).toBe(false);
  });

  it("rejects a bad slug", () => {
    expect(categoryInput.safeParse({ ...validCategory, slug: "Not A Slug" }).success).toBe(false);
  });

  it("rejects an unknown field (strict)", () => {
    expect(categoryInput.safeParse({ ...validCategory, extra: 1 }).success).toBe(false);
  });

  it("rejects a too-short description", () => {
    expect(categoryInput.safeParse({ ...validCategory, description: "short" }).success).toBe(false);
  });
});

describe("topicInput", () => {
  it("accepts a well-formed topic", () => {
    expect(
      topicInput.safeParse({
        categoryId: "11111111-2222-4333-8444-555555555555",
        slug: "a-topic-slug",
        name: "A topic",
      }).success,
    ).toBe(true);
  });

  it("requires a uuid category", () => {
    expect(topicInput.safeParse({ categoryId: "nope", slug: "a-topic-slug", name: "A" }).success).toBe(
      false,
    );
  });
});

describe("createCardInput", () => {
  it("accepts a well-formed card", () => {
    expect(createCardInput.safeParse(validCard).success).toBe(true);
  });

  it("rejects a non-https source", () => {
    expect(
      createCardInput.safeParse({ ...validCard, sourceUrl: "http://example.com/x" }).success,
    ).toBe(false);
  });

  it("rejects a loopback source", () => {
    expect(
      createCardInput.safeParse({ ...validCard, sourceUrl: "https://localhost/x" }).success,
    ).toBe(false);
  });

  it("rejects more than three takeaways", () => {
    expect(
      createCardInput.safeParse({
        ...validCard,
        takeaways: ["one is long enough", "two is long enough", "three is long enough", "four too"],
      }).success,
    ).toBe(false);
  });

  it("caps the quality score at 100", () => {
    expect(createCardInput.safeParse({ ...validCard, qualityScore: 101 }).success).toBe(false);
  });
});

describe("cardVersionInput", () => {
  it("accepts a correction", () => {
    expect(
      cardVersionInput.safeParse({
        contentId: "11111111-2222-4333-8444-555555555555",
        title: "A corrected title",
        summary: "A corrected summary that is comfortably past the forty character minimum here.",
        takeaways: ["A takeaway long enough to count."],
        nextStep: "Do the thing it suggests.",
        sourceName: "Example Publisher",
      }).success,
    ).toBe(true);
  });
});

describe("archiveInput", () => {
  it("accepts an archive instruction", () => {
    expect(
      archiveInput.safeParse({ id: "11111111-2222-4333-8444-555555555555", archived: true }).success,
    ).toBe(true);
  });

  it("rejects a non-boolean archived flag", () => {
    expect(
      archiveInput.safeParse({ id: "11111111-2222-4333-8444-555555555555", archived: "yes" }).success,
    ).toBe(false);
  });
});
