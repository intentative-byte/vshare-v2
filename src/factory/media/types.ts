/**
 * Multimedia Knowledge Engine — types.
 *
 * Provider-independent model for embedded educational media. The engine never
 * downloads or rehosts third-party media: it validates, classifies, assesses
 * and prepares candidates for human editorial review, and produces
 * privacy-respecting EMBED specs that preserve the provider's own player,
 * controls and attribution. Popularity is never treated as educational quality.
 */
import type { Level } from "../types";

export type MediaProvider = "youtube" | "vimeo";
export type MediaKind = "video" | "image" | "text";

export type MediaReviewStatus = "draft" | "in_review" | "approved" | "rejected";

/** Whether existence/attribution was confirmed against a live provider endpoint. */
export type LiveVerification = "verified" | "not_verified";

export interface QualityAssessment {
  /** 0–100 editorial judgement; NOT derived from view counts. */
  score: number;
  reasons: string[];
}

export interface SafetyAssessment {
  isHighImpact: boolean;
  requiresSecondReviewer: boolean;
  disclaimers: string[];
  notes: string[];
}

export interface VideoCandidate {
  kind: "video";
  provider: MediaProvider;
  providerId: string;
  originalUrl: string;
  /** Creator / channel attribution — never stripped. */
  channel: string;
  channelUrl?: string;
  title: string;
  category: string;
  topic: string;
  /** Editorial educational objective (proposed; confirmed at review). */
  objective: string;
  level: Level;
  /** Embedding eligibility — false until confirmed. */
  embeddable: boolean;
  /** Source/licence where relevant (e.g. CC-BY). */
  licence?: string;
  captionsAvailable?: boolean;
  durationSeconds?: number;
  /** Whether a live provider check confirmed existence + attribution. */
  liveVerified: LiveVerification;
  reviewStatus: MediaReviewStatus;
  quality?: QualityAssessment;
  safety?: SafetyAssessment;
}

export interface ImageCard {
  kind: "image";
  imageUrl: string;
  alt: string;
  credit: string;
  creditUrl?: string;
  licence: string;
  title: string;
  category: string;
  topic: string;
  objective: string;
  level: Level;
  reviewStatus: MediaReviewStatus;
}

export interface TextCard {
  kind: "text";
  title: string;
  body: string;
  category: string;
  topic: string;
  objective: string;
  level: Level;
  source?: { publisher: string; url: string };
  reviewStatus: MediaReviewStatus;
}

export type MediaCard = VideoCandidate | ImageCard | TextCard;

/** A privacy-respecting embed, ready to place in an iframe. */
export interface EmbedSpec {
  provider: MediaProvider;
  src: string;
  title: string;
  attribution: { channel: string; originalUrl: string };
  /** The iframe allow attribute (no autoplay by default). */
  allow: string;
  /** Provider controls are preserved; we never strip the player chrome. */
  preservesProviderControls: true;
}

export interface CandidateIssue {
  field: string;
  message: string;
}

export interface MediaReview {
  candidate: VideoCandidate;
  stage: "validated" | "rejected";
  issues: CandidateIssue[];
  embed?: EmbedSpec;
}
