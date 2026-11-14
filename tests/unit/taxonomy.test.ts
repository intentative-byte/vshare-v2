import { describe, expect, it } from "vitest";
import {
  allTopics,
  categories,
  featuredTopicSlugs,
  findCategory,
  findTopic,
} from "@/modules/content";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("launch taxonomy", () => {
  it("holds the eight approved categories", () => {
    expect(categories).toHaveLength(8);
    expect(categories.map((category) => category.name)).toEqual([
      "Technology and AI",
      "Career Development",
      "Entrepreneurship",
      "Personal Finance",
      "Productivity",
      "Communication",
      "Health and Wellbeing",
      "Learning How to Learn",
    ]);
  });

  it("uses unique, URL-safe slugs throughout", () => {
    const categorySlugs = categories.map((category) => category.slug);
    const topicSlugs = allTopics().map((topic) => topic.slug);

    expect(new Set(categorySlugs).size).toBe(categorySlugs.length);
    expect(new Set(topicSlugs).size).toBe(topicSlugs.length);

    for (const slug of [...categorySlugs, ...topicSlugs]) {
      expect(slug, slug).toMatch(slugPattern);
    }
  });

  it("describes every category and gives it topics", () => {
    for (const category of categories) {
      expect(category.description.length, category.slug).toBeGreaterThan(20);
      expect(category.topics.length, category.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("marks finance and health as high impact, so they need a named reviewer", () => {
    const highImpact = categories.filter((category) => category.isHighImpact).map((c) => c.slug);

    expect(highImpact).toEqual(["personal-finance", "health-and-wellbeing"]);
  });

  it("resolves categories and topics by slug", () => {
    expect(findCategory("productivity")?.name).toBe("Productivity");
    expect(findCategory("does-not-exist")).toBeUndefined();
    expect(findTopic("budgeting")?.categoryName).toBe("Personal Finance");
    expect(findTopic("does-not-exist")).toBeUndefined();
  });

  it("features eight real topics on the home page", () => {
    expect(featuredTopicSlugs).toHaveLength(8);

    for (const slug of featuredTopicSlugs) {
      expect(findTopic(slug), slug).toBeDefined();
    }
  });
});
