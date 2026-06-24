import type { NormalizedContent } from "@/lib/types";

export type MediaRendererKind = "short_video" | "article" | "carousel" | "framework" | "thread" | "audio" | "tutorial";

export type MediaPresentation = {
  renderer: MediaRendererKind;
  eyebrow: string;
  primaryAction: string;
  visualTone: string;
};

export function getMediaPresentation(content: NormalizedContent): MediaPresentation {
  if (content.contentType === "video") {
    return {
      renderer: "short_video",
      eyebrow: "Short video",
      primaryAction: "Watch",
      visualTone: "from-violet-600 to-ink",
    };
  }

  if (content.contentType === "podcast") {
    return {
      renderer: "audio",
      eyebrow: "Audio",
      primaryAction: "Listen",
      visualTone: "from-slate-700 to-ink",
    };
  }

  if (content.contentType === "framework") {
    return {
      renderer: "framework",
      eyebrow: "Framework",
      primaryAction: "Apply",
      visualTone: "from-emerald-600 to-ink",
    };
  }

  if (content.contentType === "thread" || content.contentType === "post") {
    return {
      renderer: content.contentType === "thread" ? "thread" : "carousel",
      eyebrow: content.contentType === "thread" ? "Thread" : "Carousel",
      primaryAction: "Review",
      visualTone: "from-blue-600 to-ink",
    };
  }

  if (content.contentType === "tutorial") {
    return {
      renderer: "tutorial",
      eyebrow: "Tutorial",
      primaryAction: "Practice",
      visualTone: "from-amber-600 to-ink",
    };
  }

  return {
    renderer: "article",
    eyebrow: "Article",
    primaryAction: "Read",
    visualTone: "from-fuchsia-600 to-ink",
  };
}

export function getMediaSteps(content: NormalizedContent) {
  const [firstInterest, secondInterest] = content.interests;

  if (content.contentType === "framework") {
    return ["Context", "Decision rule", "Apply today"];
  }

  if (content.contentType === "tutorial") {
    return ["Setup", "Practice", "Reflect"];
  }

  if (content.contentType === "thread" || content.contentType === "post") {
    return [firstInterest ?? "Focus", secondInterest ?? "Signal", "Next action"];
  }

  return ["Why it matters", "Core idea", "Use it"];
}
