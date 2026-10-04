"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, TriangleAlert } from "lucide-react";
import { OUTCOME_LABEL, conditionOf, outcomeOf, signed, type Clip, type Condition } from "@/lib/results";

// One big word. Numbers wait behind "Details" (or hover).
export default function Verdict({ clip, cond }: { clip: Clip; cond: Condition }) {
  const [open, setOpen] = useState(false);
  const outcome = outcomeOf(clip, cond);
  const ok = outcome === "correct";
  const orig = conditionOf(clip, "original").prediction;
  const word = cond.prediction === "genuine" ? "Genuine" : "Synthetic";

  return (
    <div className="card group flex min-w-0 flex-[1_1_300px] flex-col p-6" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink3">Verdict</span>
        {cond.condition === "live" ? (
          <span className="inline-flex h-[26px] items-center rounded-full border border-genuine/50 bg-genuine/10 px-2.5 text-xs font-medium">Live run</span>
        ) : (
          <span className="inline-flex h-[26px] items-center rounded-full border border-line2 px-2.5 text-xs font-medium text-ink2">Saved</span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center pb-2 pt-6">
        <div className="relative h-[clamp(52px,6.4vw,80px)] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={cond.prediction}
              className={`text-[clamp(48px,6vw,76px)] font-semibold leading-[1] tracking-[-0.045em] ${cond.prediction === "genuine" ? "text-genuine" : "text-synthetic"}`}
              initial={{ y: 28, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -28, opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${
              ok ? "bg-s2 text-ink" : "bg-bad/15 text-bad"
            }`}
          >
            {ok ? <Check size={14} className="text-ok" /> : <TriangleAlert size={14} />}
            {OUTCOME_LABEL[outcome]}
          </span>
          <AnimatePresence>
            {cond.prediction !== orig && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex h-7 items-center rounded-full border border-line2 px-3 text-xs font-medium text-ink2"
              >
                was {orig} when clean
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <dl
          className={`grid grid-cols-2 gap-x-5 gap-y-2.5 overflow-hidden transition-all duration-500 ${
            open ? "mt-6 max-h-40 opacity-100" : "mt-0 max-h-0 opacity-0 group-hover:mt-6 group-hover:max-h-40 group-hover:opacity-100"
          }`}
        >
          {[
            ["Known label", clip.known_label],
            ["Margin", signed(cond.genuine_margin)],
            ["Genuine logit", signed(cond.genuine_logit, 3)],
            ["Synthetic logit", signed(cond.synthetic_logit, 3)],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="text-xs text-ink3">{k}</dt>
              <dd className="font-mono text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-ml-2.5 self-start rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink3 transition-colors hover:bg-s2 hover:text-ink"
      >
        {open ? "Hide details" : "Details"}
      </button>
    </div>
  );
}
