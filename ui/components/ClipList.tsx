"use client";

import { motion } from "motion/react";
import { CONDITION_ORDER, CONDITION_SHORT, conditionOf, OUTCOME_LABEL, outcomeOf, results } from "@/lib/results";

// Eight clips as pills. Three dots show the verdict at clean, 20 dB and 10 dB; a red ring marks a wrong one.
export default function ClipList({ clipId, onSelect }: { clipId: string; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="Clips" className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
      {results.clips.map((clip) => {
        const isActive = clip.sample_id === clipId;
        const summary = CONDITION_ORDER.map((id) => {
          const c = conditionOf(clip, id);
          const o = outcomeOf(clip, c);
          return `${CONDITION_SHORT[id]}: ${c.prediction}${o === "correct" ? "" : ` (${OUTCOME_LABEL[o]})`}`;
        }).join(", ");
        return (
          <motion.button
            key={clip.sample_id}
            type="button"
            onClick={() => onSelect(clip.sample_id)}
            aria-current={isActive}
            aria-label={`${clip.sample_id}, known ${clip.known_label}. ${summary}`}
            title={summary}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative flex shrink-0 flex-col items-center gap-1.5 rounded-xl border px-3 pb-2 pt-2.5 transition-colors ${
              isActive ? "border-ink text-bg" : "border-line bg-s1 hover:border-line2"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="clip-pill"
                className="absolute inset-0 rounded-[11px] bg-ink"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative font-mono text-[12.5px] font-medium">{clip.sample_id}</span>
            <span className="relative flex gap-1" aria-hidden>
              {CONDITION_ORDER.map((id) => {
                const c = conditionOf(clip, id);
                const wrong = outcomeOf(clip, c) !== "correct";
                return (
                  <span
                    key={id}
                    className={`h-[7px] w-[7px] rounded-full ${c.prediction === "genuine" ? "bg-genuine" : "bg-synthetic"}`}
                    style={{
                      boxShadow: wrong ? `0 0 0 1.5px ${isActive ? "#EDEEF0" : "#111316"}, 0 0 0 3px #FF7A6E` : "none",
                    }}
                  />
                );
              })}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
