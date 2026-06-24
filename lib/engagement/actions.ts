import type { NormalizedContent, UserSignalType } from "@/lib/types";

export type QuickAction = "save" | "share" | "like" | "not_interested" | "complete" | "replay";

export function getActionSignal(action: QuickAction, content: NormalizedContent): {
  type: UserSignalType;
  contentId: string;
  value?: number;
} {
  if (action === "save") {
    return { type: "content_saved", contentId: content.id };
  }

  if (action === "share") {
    return { type: "content_shared", contentId: content.id };
  }

  if (action === "like") {
    return { type: "content_liked", contentId: content.id };
  }

  if (action === "not_interested") {
    return { type: "not_interested", contentId: content.id, value: 1.5 };
  }

  if (action === "replay") {
    return { type: "replay", contentId: content.id };
  }

  return { type: "content_completed", contentId: content.id };
}
