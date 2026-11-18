import { describe, expect, it } from "vitest";
import { nextBestMove, type NextBestFacts } from "@/modules/vai";

const now = new Date("2026-11-14T12:00:00Z").getTime();

function facts(overrides: Partial<NextBestFacts> = {}): NextBestFacts {
  return {
    startedNotFinished: [],
    savedNotOpened: [],
    topCandidate: null,
    declaredTopicCount: 0,
    completedCount: 0,
    now,
    ...overrides,
  };
}

describe("next best move", () => {
  it("asks you to finish what you started, before anything else", () => {
    const move = nextBestMove(
      facts({
        startedNotFinished: [
          { contentId: "a", title: "A half-read card", openedAt: "2026-11-13T12:00:00Z" },
        ],
        savedNotOpened: [{ contentId: "b", title: "A saved card", savedAt: "2026-11-13T12:00:00Z" }],
        topCandidate: { contentId: "c", title: "Something new", topicName: "Focus" },
        declaredTopicCount: 3,
      }),
    );

    expect(move.rule).toBe("finish_started");
    expect(move.contentId).toBe("a");
    expect(move.reason).toBe("You opened this and did not mark it done.");
  });

  it("lets something started long ago go, rather than nagging", () => {
    const move = nextBestMove(
      facts({
        startedNotFinished: [
          { contentId: "a", title: "An old one", openedAt: "2026-09-01T12:00:00Z" },
        ],
        topCandidate: { contentId: "c", title: "Something new", topicName: "Focus" },
        declaredTopicCount: 2,
        completedCount: 4,
      }),
    );

    expect(move.rule).toBe("continue_topic");
  });

  it("offers a saved card when nothing is half-finished", () => {
    const move = nextBestMove(
      facts({
        savedNotOpened: [{ contentId: "b", title: "A saved card", savedAt: "2026-11-13T12:00:00Z" }],
        topCandidate: { contentId: "c", title: "Something new", topicName: "Focus" },
        declaredTopicCount: 2,
      }),
    );

    expect(move.rule).toBe("open_saved");
    expect(move.contentId).toBe("b");
  });

  it("asks for a topic rather than guessing", () => {
    const move = nextBestMove(
      facts({ topCandidate: { contentId: "c", title: "Something", topicName: "Focus" } }),
    );

    expect(move.rule).toBe("pick_topic");
    expect(move.contentId).toBeNull();
    expect(move.href).toBe("/explore");
  });

  it("distinguishes a first card from carrying on", () => {
    const first = nextBestMove(
      facts({
        declaredTopicCount: 2,
        completedCount: 0,
        topCandidate: { contentId: "c", title: "A first card", topicName: "Focus" },
      }),
    );
    const later = nextBestMove(
      facts({
        declaredTopicCount: 2,
        completedCount: 6,
        topCandidate: { contentId: "c", title: "Another card", topicName: "Focus" },
      }),
    );

    expect(first.rule).toBe("start_first");
    expect(later.rule).toBe("continue_topic");
    expect(first.reason).not.toBe(later.reason);
  });

  it("says plainly when there is nothing left", () => {
    const move = nextBestMove(facts({ declaredTopicCount: 3, completedCount: 12 }));

    expect(move.rule).toBe("nothing_left");
    expect(move.reason).toMatch(/worked through everything/);
  });

  it("always gives an action, a reason and somewhere to go", () => {
    const cases = [
      facts(),
      facts({ declaredTopicCount: 1 }),
      facts({ declaredTopicCount: 1, topCandidate: { contentId: "c", title: "T", topicName: "F" } }),
      facts({ savedNotOpened: [{ contentId: "b", title: "S", savedAt: "2026-11-13T12:00:00Z" }] }),
    ];

    for (const input of cases) {
      const move = nextBestMove(input);

      expect(move.action.length).toBeGreaterThan(0);
      expect(move.reason.length).toBeGreaterThan(0);
      expect(move.href.startsWith("/")).toBe(true);
    }
  });
});
