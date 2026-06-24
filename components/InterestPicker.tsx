"use client";

import { interestOptions } from "@/lib/data";
import type { Interest } from "@/lib/types";
import { cn } from "@/lib/utils";

type InterestPickerProps = {
  selectedInterests: Interest[];
  onChange: (interests: Interest[]) => void;
};

export function InterestPicker({ selectedInterests, onChange }: InterestPickerProps) {
  function toggleInterest(interest: Interest) {
    onChange(
      selectedInterests.includes(interest)
        ? selectedInterests.filter((selectedInterest) => selectedInterest !== interest)
        : [...selectedInterests, interest],
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {interestOptions.map((interest) => (
        <button
          key={interest}
          type="button"
          onClick={() => toggleInterest(interest)}
          className={cn(
            "rounded-3xl border px-4 py-4 text-left text-sm font-black transition",
            selectedInterests.includes(interest)
              ? "border-ink bg-ink text-white shadow-soft"
              : "border-white bg-white text-ink shadow-soft hover:border-violet-200",
          )}
        >
          {interest}
        </button>
      ))}
    </div>
  );
}
