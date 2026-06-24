"use client";

import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/Button";
import { addDecision } from "@/lib/learning";
import { createDecisionOption } from "@/lib/decisions/decision-framework";
import type { DecisionOption, DecisionType } from "@/lib/types";

const decisionTypes: Array<{ value: DecisionType; label: string }> = [
  { value: "career", label: "Career" },
  { value: "business", label: "Business" },
  { value: "health", label: "Health" },
  { value: "learning", label: "Learning" },
  { value: "financial", label: "Financial" },
  { value: "personal", label: "Personal" },
];

export function DecisionLogger() {
  const [type, setType] = useState<DecisionType>("learning");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [optionLabel, setOptionLabel] = useState("");
  const [upside, setUpside] = useState("");
  const [downside, setDownside] = useState("");
  const [risk, setRisk] = useState(35);
  const [leverage, setLeverage] = useState(65);
  const [options, setOptions] = useState<DecisionOption[]>([]);
  const [chosenOptionId, setChosenOptionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const chosenOption = useMemo(() => options.find((option) => option.id === chosenOptionId), [chosenOptionId, options]);

  function addOption() {
    if (optionLabel.trim().length < 2) {
      setMessage("Add an option label.");
      return;
    }

    const option = createDecisionOption({
      label: optionLabel,
      upside,
      downside,
      risk,
      leverage,
    });
    setOptions((current) => [...current, option].slice(0, 5));
    setChosenOptionId((current) => current || option.id);
    setOptionLabel("");
    setUpside("");
    setDownside("");
  }

  function submitDecision() {
    const result = addDecision({
      type,
      decision,
      reason,
      desiredOutcome,
      options,
      chosenOptionId,
    });

    if (!result.ok) {
      setMessage("Add a decision, why, outcome, at least two options, and a chosen path.");
      return;
    }

    setDecision("");
    setReason("");
    setDesiredOutcome("");
    setOptions([]);
    setChosenOptionId("");
    setMessage("Decision saved. VShare will learn from the outcome.");
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-ink p-3 text-white">
          <GitBranch className="size-5" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Decision intelligence</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Log a decision</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Capture options, risks, leverage, chosen path, and outcome target.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as DecisionType)}
          className="min-h-12 rounded-2xl border border-slate-200 px-4 font-semibold outline-none"
        >
          {decisionTypes.map((decisionType) => (
            <option key={decisionType.value} value={decisionType.value}>
              {decisionType.label}
            </option>
          ))}
        </select>
        <input value={decision} onChange={(event) => setDecision(event.target.value)} placeholder="Decision" className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why does this matter?" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none" />
        <textarea value={desiredOutcome} onChange={(event) => setDesiredOutcome(event.target.value)} placeholder="Desired outcome" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none" />

        <div className="rounded-3xl bg-mist p-4">
          <h3 className="font-black">Options</h3>
          <div className="mt-3 grid gap-3">
            <input value={optionLabel} onChange={(event) => setOptionLabel(event.target.value)} placeholder="Option" className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
            <input value={upside} onChange={(event) => setUpside(event.target.value)} placeholder="Upside" className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
            <input value={downside} onChange={(event) => setDownside(event.target.value)} placeholder="Downside" className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-black">
                Risk: {risk}
                <input type="range" min="0" max="100" value={risk} onChange={(event) => setRisk(Number(event.target.value))} className="mt-2 w-full accent-violet" />
              </label>
              <label className="text-sm font-black">
                Leverage: {leverage}
                <input type="range" min="0" max="100" value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} className="mt-2 w-full accent-violet" />
              </label>
            </div>
            <Button type="button" variant="secondary" onClick={addOption}>
              Add option
            </Button>
          </div>
        </div>

        {options.length ? (
          <div className="grid gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setChosenOptionId(option.id)}
                className={`rounded-2xl p-4 text-left font-bold ${chosenOptionId === option.id ? "bg-ink text-white" : "bg-mist text-ink"}`}
              >
                {option.label} · risk {option.risk} · leverage {option.leverage}
              </button>
            ))}
          </div>
        ) : null}

        {chosenOption ? (
          <p className="rounded-2xl bg-violet-50 p-3 text-sm font-bold text-violet-700">
            Recommendation: {chosenOption.leverage >= chosenOption.risk ? `Choose ${chosenOption.label}` : `Test ${chosenOption.label} before committing`}
          </p>
        ) : null}

        <Button type="button" onClick={submitDecision} className="w-full py-3">
          Save decision
        </Button>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-mist p-3 text-sm font-bold text-slate-600">{message}</p> : null}
    </section>
  );
}
