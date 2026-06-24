"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { addGoal, addProject } from "@/lib/learning";
import { goalTypes } from "@/lib/goals/goal-engine";
import type { GoalType, Interest } from "@/lib/types";

export function GrowthPlanner() {
  const [goalType, setGoalType] = useState<GoalType>("learn");
  const [goalTitle, setGoalTitle] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [topics, setTopics] = useState<Interest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function handleGoalSubmit() {
    const result = addGoal({
      type: goalType,
      title: goalTitle,
      desiredOutcome,
      topics,
    });

    if (!result.ok) {
      setMessage("Add a goal title, desired outcome, and topic.");
      return;
    }

    setGoalTitle("");
    setDesiredOutcome("");
    setMessage("Goal added. Roadmap generated.");
  }

  function handleProjectSubmit() {
    const result = addProject({
      title: projectTitle,
      description: projectDescription,
      skills: skills.split(","),
      topics,
    });

    if (!result.ok) {
      setMessage("Add a project title, description, and topic.");
      return;
    }

    setProjectTitle("");
    setProjectDescription("");
    setSkills("");
    setMessage("Project added. Decisions will account for it.");
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-ink p-3 text-white">
          <Compass className="size-5" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Growth operating system</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Set direction</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Add a goal or project so VShare can pick the highest leverage action.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="grid gap-3 rounded-3xl bg-mist p-4">
          <h3 className="font-black">Goal</h3>
          <select
            value={goalType}
            onChange={(event) => setGoalType(event.target.value as GoalType)}
            className="min-h-12 rounded-2xl border border-slate-200 px-4 font-semibold outline-none"
          >
            {goalTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <input
            value={goalTitle}
            onChange={(event) => setGoalTitle(event.target.value)}
            placeholder="Learn Python, launch business..."
            className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none"
          />
          <textarea
            value={desiredOutcome}
            onChange={(event) => setDesiredOutcome(event.target.value)}
            placeholder="Desired position or outcome"
            rows={3}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
          <Button type="button" onClick={handleGoalSubmit}>
            Add goal
          </Button>
        </div>

        <div className="grid gap-3 rounded-3xl bg-mist p-4">
          <h3 className="font-black">Project</h3>
          <input
            value={projectTitle}
            onChange={(event) => setProjectTitle(event.target.value)}
            placeholder="Project title"
            className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none"
          />
          <textarea
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="What are you building?"
            rows={3}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
          <input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Skills, comma separated"
            className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none"
          />
          <Button type="button" onClick={handleProjectSubmit}>
            Add project
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <InterestPicker selectedInterests={topics} onChange={setTopics} />
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-mist p-3 text-sm font-bold text-slate-600">{message}</p> : null}
    </section>
  );
}
