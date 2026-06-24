"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { evidenceTypes } from "@/lib/evidence/evidence-engine";
import { logOutcome } from "@/lib/learning";
import { outcomeTypes } from "@/lib/outcomes/outcome-system";
import type { EvidenceType, Interest, OutcomeType } from "@/lib/types";

export function OutcomeLogger() {
  const [type, setType] = useState<OutcomeType>("learned_skill");
  const [goal, setGoal] = useState("");
  const [action, setAction] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<Interest[]>([]);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("note");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceValue, setEvidenceValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit() {
    const result = logOutcome({
      type,
      goal,
      action,
      title,
      description,
      topics,
      evidence:
        evidenceLabel.trim() || evidenceValue.trim()
          ? {
              type: evidenceType,
              label: evidenceLabel,
              value: evidenceValue,
            }
          : undefined,
    });

    if (!result.ok) {
      setMessage(result.error === "invalid_evidence" ? "Evidence needs a label and value." : "Add a title, description, and topic.");
      return;
    }

    setTitle("");
    setGoal("");
    setAction("");
    setDescription("");
    setTopics([]);
    setEvidenceLabel("");
    setEvidenceValue("");
    setMessage("Outcome logged. Capability score updated.");
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-ink p-3 text-white">
          <Trophy className="size-5" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Proof of learning</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Log a real-world outcome</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Attach evidence so VShare measures capability, not consumption.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as OutcomeType)}
          className="min-h-12 rounded-2xl border border-slate-200 px-4 font-semibold outline-none"
        >
          {outcomeTypes.map((outcome) => (
            <option key={outcome.value} value={outcome.value}>
              {outcome.label}
            </option>
          ))}
        </select>
        <input
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="Goal this outcome supports"
          className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Action you took"
          className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What changed in the real world?"
          className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what you did, built, passed, earned, changed, or proved."
          rows={4}
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <InterestPicker selectedInterests={topics} onChange={setTopics} />
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={evidenceType}
            onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
            className="min-h-12 rounded-2xl border border-slate-200 px-4 font-semibold outline-none"
          >
            {evidenceTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            value={evidenceLabel}
            onChange={(event) => setEvidenceLabel(event.target.value)}
            placeholder="Evidence label"
            className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
          <input
            value={evidenceValue}
            onChange={(event) => setEvidenceValue(event.target.value)}
            placeholder="Link, note, file name, or proof"
            className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </div>
        <Button type="button" onClick={handleSubmit} className="w-full py-3">
          Log outcome
        </Button>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-mist p-3 text-sm font-bold text-slate-600">{message}</p> : null}
    </section>
  );
}
