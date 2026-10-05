"use client";

import { motion } from "motion/react";
import { Download, TriangleAlert } from "lucide-react";
import { downloadCsv } from "@/lib/export";
import {
  CONDITION_LABEL,
  CONDITION_ORDER,
  CONDITION_SHORT,
  OUTCOME_LABEL,
  conditionOf,
  outcomeOf,
  results,
  signed,
  summarize,
  type ConditionId,
} from "@/lib/results";

export default function ResultsMatrix({
  clipId,
  condId,
  onSelect,
}: {
  clipId: string;
  condId: ConditionId;
  onSelect: (clip: string, cond: ConditionId) => void;
}) {
  return (
    <div>
      <div className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {CONDITION_ORDER.map((id, i) => {
          const s = summarize(id);
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onSelect(clipId, id)}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
              aria-label={`${CONDITION_LABEL[id]}: ${s.correct} of ${s.total} correct, ${s.falseAlarms} false alarms, ${s.missed} missed synthetic`}
              className="card flex flex-col gap-1 !rounded-2xl px-6 py-5 text-left"
            >
              <span className="text-[13px] text-ink3">{CONDITION_SHORT[id] === "Clean" ? "Clean" : `${CONDITION_SHORT[id]} noise`}</span>
              <span className="font-mono text-[44px] font-medium leading-[1.05] tracking-[-0.04em]">
                {s.correct}
                <span className="text-xl text-ink3">/{s.total}</span>
              </span>
              <span className={`text-[13px] ${s.falseAlarms || s.missed ? "font-medium text-bad" : "text-ink3"}`}>
                {s.falseAlarms} false alarm{s.falseAlarms === 1 ? "" : "s"} · {s.missed} missed synthetic
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="scrollbar-none mt-7 overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="mb-2 grid grid-cols-[minmax(96px,1fr)_repeat(3,minmax(0,1fr))] gap-1.5 text-xs text-ink3">
            <span />
            {CONDITION_ORDER.map((id) => (
              <span key={id} className="text-center">
                {CONDITION_SHORT[id]}
              </span>
            ))}
          </div>
          {results.clips.map((clip) => (
            <div key={clip.sample_id} className="mb-1.5 grid grid-cols-[minmax(96px,1fr)_repeat(3,minmax(0,1fr))] items-center gap-1.5">
              <span className="font-mono text-[13px] text-ink2">{clip.sample_id}</span>
              {CONDITION_ORDER.map((id) => {
                const c = conditionOf(clip, id);
                const o = outcomeOf(clip, c);
                const selected = clip.sample_id === clipId && id === condId;
                return (
                  <span key={id} className="tw w-full">
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      onClick={() => onSelect(clip.sample_id, id)}
                      aria-label={`${clip.sample_id}, ${CONDITION_LABEL[id]}: ${c.prediction}, margin ${signed(c.genuine_margin)}, ${OUTCOME_LABEL[o]}`}
                      className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium ${
                        c.prediction === "genuine" ? "bg-genuine/12 text-genuine" : "bg-synthetic/12 text-synthetic"
                      }`}
                      style={{
                        boxShadow: selected ? "inset 0 0 0 1.5px #EDEEF0" : o !== "correct" ? "inset 0 0 0 1.5px #FF7A6E" : "none",
                      }}
                    >
                      <span className="max-sm:hidden">{c.prediction === "genuine" ? "Genuine" : "Synthetic"}</span>
                      {o !== "correct" && <TriangleAlert size={14} className="text-bad" />}
                    </motion.button>
                    <span role="tooltip" className="tt">
                      Known {clip.known_label} · margin {signed(c.genuine_margin)}
                      {o !== "correct" && ` · ${OUTCOME_LABEL[o]}`}
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink3">
        <span>8 clips, not a benchmark · seed 42</span>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] px-3 font-medium text-ink3 transition-colors hover:bg-s2 hover:text-ink"
        >
          <Download size={16} />
          results.csv
        </button>
      </div>
    </div>
  );
}
