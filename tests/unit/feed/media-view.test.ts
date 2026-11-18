import { describe, expect, it } from "vitest";
import { isMissingMediaTableError } from "@/modules/feed/media-errors";
import { approvedMediaToFeedItems } from "@/components/feed/media-view";
import type { ApprovedMediaRow } from "@/modules/feed/server";

const row = (over: Partial<ApprovedMediaRow> = {}): ApprovedMediaRow => ({
  id: "m1",
  content_id: "c1",
  provider: "youtube",
  provider_id: "aircAruvnKk",
  original_url: "https://www.youtube.com/watch?v=aircAruvnKk",
  media_type: "video",
  channel: "3Blue1Brown",
  channel_url: "https://www.youtube.com/@3blue1brown",
  title: "But what is a neural network?",
  objective: "See what a neural network represents.",
  licence: null,
  embeddable: true,
  captions_available: true,
  ...over,
});

describe("isMissingMediaTableError — safe fallback when migration 9 is absent", () => {
  it("recognises the missing-table / missing-schema errors", () => {
    expect(isMissingMediaTableError({ code: "42P01" })).toBe(true);
    expect(isMissingMediaTableError({ code: "PGRST205" })).toBe(true);
    expect(isMissingMediaTableError({ message: "Could not find the table 'public.content_media' in the schema cache" })).toBe(true);
    expect(isMissingMediaTableError({ message: 'relation "public.content_media" does not exist' })).toBe(true);
  });
  it("does not misclassify an unrelated error or a null", () => {
    expect(isMissingMediaTableError({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingMediaTableError(null)).toBe(false);
  });
});

describe("approvedMediaToFeedItems — mixed-format mapping with attribution", () => {
  it("maps a video row to a privacy-embedded feed item with attribution and objective", () => {
    const [item] = approvedMediaToFeedItems([row()]);
    expect(item?.kind).toBe("video");
    if (item?.kind === "video") {
      expect(item.src).toContain("youtube-nocookie.com/embed/aircAruvnKk");
      expect(item.src).not.toContain("autoplay=1");
      expect(item.channel).toBe("3Blue1Brown");
      expect(item.objective).toContain("neural network");
      expect(item.liveVerified).toBe(true);
    }
  });
  it("maps an image row preserving licence and attribution", () => {
    const [item] = approvedMediaToFeedItems([
      row({ id: "img1", provider: "image", provider_id: null, original_url: "https://img.test/chart.jpg", media_type: "image", channel: "Jane Doe", licence: "CC-BY-4.0", title: "Compound interest" }),
    ]);
    expect(item?.kind).toBe("image");
    if (item?.kind === "image") {
      expect(item.imageUrl).toBe("https://img.test/chart.jpg");
      expect(item.licence).toBe("CC-BY-4.0");
      expect(item.credit).toBe("Jane Doe");
    }
  });
  it("skips a row with a malformed provider id rather than crashing", () => {
    expect(approvedMediaToFeedItems([row({ provider_id: "bad" })])).toHaveLength(0);
  });
  it("produces an empty feed from no rows (safe fallback)", () => {
    expect(approvedMediaToFeedItems([])).toEqual([]);
  });
  it("keeps a mixed feed in order", () => {
    const items = approvedMediaToFeedItems([
      row({ id: "v1" }),
      row({ id: "i1", provider: "image", provider_id: null, original_url: "https://img.test/a.png", media_type: "image", channel: "x", licence: "cc0" }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(["video", "image"]);
  });
});
