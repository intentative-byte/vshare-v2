import type { EvidenceAttachment, EvidenceType, UserOutcome } from "@/lib/types";

export const evidenceTypes: Array<{ value: EvidenceType; label: string; score: number }> = [
  { value: "link", label: "Link", score: 12 },
  { value: "screenshot", label: "Screenshot", score: 18 },
  { value: "document", label: "Document", score: 20 },
  { value: "video", label: "Video", score: 22 },
  { value: "note", label: "Note", score: 10 },
];

export function createEvidence(input: { type: EvidenceType; label: string; value: string }): EvidenceAttachment {
  return {
    id: `evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: input.type,
    label: input.label.trim(),
    value: input.value.trim(),
    addedAt: new Date().toISOString(),
  };
}

export function isValidEvidence(input: { label: string; value: string }) {
  return input.label.trim().length >= 3 && input.value.trim().length >= 3;
}

export function getEvidenceScore(evidence: EvidenceAttachment[], outcomes: UserOutcome[]) {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));

  return outcomes.reduce((total, outcome) => {
    const outcomeEvidenceScore = outcome.evidenceIds.reduce((score, evidenceId) => {
      const item = evidenceById.get(evidenceId);
      return score + (evidenceTypes.find((type) => type.value === item?.type)?.score ?? 0);
    }, 0);

    return total + Math.min(40, outcomeEvidenceScore);
  }, 0);
}
