/**
 * The metrics dictionary and the small calculations the dashboard does.
 *
 * The point of most of these is that "no data" and "zero" are different
 * answers, and the interface must never show one as the other.
 */

import { describe, expect, it } from "vitest";
import {
  metrics,
  findMetric,
  metricsByTier,
  valueTiers,
  rate,
  describeSeconds,
  suppressionThreshold,
} from "@/modules/analytics/metrics";
import { eventNames, eventDefinitions } from "@/modules/analytics/events";

describe("the dictionary", () => {
  it("gives every metric a definition and a limit", () => {
    for (const metric of metrics) {
      expect(metric.definition.length).toBeGreaterThan(20);
      expect(metric.limit.length).toBeGreaterThan(20);
      expect(metric.label.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate names", () => {
    expect(new Set(metrics.map((m) => m.name)).size).toBe(metrics.length);
  });

  it("defines every reported event it names", () => {
    for (const metric of metrics.filter((m) => m.source === "reported")) {
      expect(eventNames).toContain(metric.name as (typeof eventNames)[number]);
    }
  });

  it("gives every event in the vocabulary a definition", () => {
    for (const name of eventNames) {
      expect(eventDefinitions[name].length).toBeGreaterThan(20);
    }
  });

  it("says plainly that a reported number cannot be verified", () => {
    const reported = metrics.filter((m) => m.source === "reported");
    expect(reported.length).toBeGreaterThan(0);

    for (const metric of reported) {
      expect(metric.limit.toLowerCase()).toContain("reported");
    }
  });

  it("finds a metric by name and returns undefined for one that does not exist", () => {
    expect(findMetric("cards_completed")?.label).toBe("Cards completed");
    expect(findMetric("mastery_score")).toBeUndefined();
  });
});

describe("the value tiers", () => {
  it("measures activity and completion", () => {
    expect(metricsByTier("activity").length).toBeGreaterThan(0);
    expect(metricsByTier("completion").length).toBeGreaterThan(0);
    expect(valueTiers.activity.status).toBe("Measured.");
    expect(valueTiers.completion.status).toBe("Measured.");
  });

  it("holds no metric at all for application or outcome", () => {
    expect(metricsByTier("application")).toHaveLength(0);
    expect(metricsByTier("outcome")).toHaveLength(0);
  });

  it("says those two tiers are not measured rather than leaving them blank", () => {
    expect(valueTiers.application.status).toContain("Not measured");
    expect(valueTiers.outcome.status).toContain("Not measured");
    expect(valueTiers.outcome.status).toContain("not estimated");
  });

  it("claims no mastery, intelligence or improvement anywhere", () => {
    const text = JSON.stringify(metrics).toLowerCase();
    expect(text).not.toContain("mastery score");
    expect(text).not.toContain("intelligence");
    expect(text).not.toContain("improvement score");
  });

  it("says that completing a card is not understanding it", () => {
    const completed = findMetric("cards_completed");
    expect(completed?.limit).toContain("not a measure of understanding");
    expect(completed?.limit).toContain("never evidence of mastery");
  });

  it("says that opening a card is not progress", () => {
    expect(findMetric("cards_opened")?.limit).toContain("Opening is not learning");
  });
});

describe("rates", () => {
  it("computes a percentage to one decimal place", () => {
    expect(rate(1, 4)).toBe(25);
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(2, 3)).toBe(66.7);
  });

  it("returns null rather than zero when there is no denominator", () => {
    expect(rate(0, 0)).toBeNull();
    expect(rate(5, 0)).toBeNull();
    expect(rate(1, -2)).toBeNull();
  });

  it("returns null when either side is missing", () => {
    expect(rate(null, 10)).toBeNull();
    expect(rate(10, null)).toBeNull();
  });

  it("distinguishes a genuine zero from no data", () => {
    expect(rate(0, 100)).toBe(0);
    expect(rate(0, 0)).toBeNull();
  });
});

describe("durations", () => {
  it("reads seconds under ninety as seconds", () => {
    expect(describeSeconds(42)).toBe("42s");
    expect(describeSeconds(89)).toBe("89s");
  });

  it("reads longer ones as minutes", () => {
    expect(describeSeconds(90)).toBe("1m 30s");
    expect(describeSeconds(120)).toBe("2m");
    expect(describeSeconds(185)).toBe("3m 5s");
  });

  it("keeps null as null rather than inventing a zero", () => {
    expect(describeSeconds(null)).toBeNull();
    expect(describeSeconds(Number.NaN)).toBeNull();
  });
});

describe("suppression", () => {
  it("matches the threshold the database applies", () => {
    // The database is the one that enforces it; this is only so the
    // interface can explain itself. If they ever disagree, the database
    // wins and this test is the warning.
    expect(suppressionThreshold).toBe(5);
  });
});
