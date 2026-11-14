/**
 * Today's next best move.
 *
 * An ordered list of rules over facts we already hold. The first that
 * applies wins, and the reason given is the rule that fired — not a
 * plausible sentence written afterwards.
 *
 * No model is involved. Every branch is a fact about what the person has
 * actually done, which is why the recommendation can always be accounted
 * for.
 */

export type NextBestRule =
  | "finish_started"
  | "open_saved"
  | "continue_topic"
  | "start_first"
  | "pick_topic"
  | "nothing_left";

export type NextBestFacts = {
  /** Opened but never completed, most recent first. */
  startedNotFinished: Array<{ contentId: string; title: string; openedAt: string }>;
  /** Saved but never opened, most recent first. */
  savedNotOpened: Array<{ contentId: string; title: string; savedAt: string }>;
  /** The best-ranked card available right now, if any. */
  topCandidate: { contentId: string; title: string; topicName: string } | null;
  declaredTopicCount: number;
  completedCount: number;
  /** Fixed point, so a test is not at the mercy of the clock. */
  now: number;
};

export type NextBestMove = {
  rule: NextBestRule;
  /** What to do, in the second person. */
  action: string;
  /** Why this and not something else. Generated from the rule that fired. */
  reason: string;
  contentId: string | null;
  /** Where the action takes them. */
  href: string;
};

const sevenDays = 7 * 24 * 60 * 60 * 1000;

export function nextBestMove(facts: NextBestFacts): NextBestMove {
  // 1. Something begun and left. Finishing beats starting.
  const started = facts.startedNotFinished.find(
    (entry) => facts.now - new Date(entry.openedAt).getTime() < sevenDays,
  );

  if (started) {
    return {
      rule: "finish_started",
      action: `Finish “${started.title}”`,
      reason: "You opened this and did not mark it done.",
      contentId: started.contentId,
      href: `/c/${started.contentId}`,
    };
  }

  // 2. Something saved for later, and later has arrived.
  const saved = facts.savedNotOpened[0];

  if (saved) {
    return {
      rule: "open_saved",
      action: `Read “${saved.title}”`,
      reason: "You saved this for later and have not opened it yet.",
      contentId: saved.contentId,
      href: `/c/${saved.contentId}`,
    };
  }

  // 3. No topics chosen: anything we suggested would be a guess.
  if (facts.declaredTopicCount === 0) {
    return {
      rule: "pick_topic",
      action: "Choose what you want to get better at",
      reason: "You have not chosen any topics yet, so there is nothing to go on.",
      contentId: null,
      href: "/explore",
    };
  }

  if (facts.topCandidate) {
    const rule: NextBestRule = facts.completedCount === 0 ? "start_first" : "continue_topic";

    return {
      rule,
      action: `Start “${facts.topCandidate.title}”`,
      reason:
        rule === "start_first"
          ? `It is the best match for the topics you chose, starting with ${facts.topCandidate.topicName}.`
          : `It follows on from what you have been doing in ${facts.topCandidate.topicName}.`,
      contentId: facts.topCandidate.contentId,
      href: "/learn",
    };
  }

  // 4. Nothing left is a real answer, and saying so is better than
  //    recycling something they have already finished.
  return {
    rule: "nothing_left",
    action: "Add a topic, or come back soon",
    reason: "You have worked through everything we have in your topics.",
    contentId: null,
    href: "/explore",
  };
}
