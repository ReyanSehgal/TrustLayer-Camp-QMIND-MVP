"use client";

import { motion } from "motion/react";
import {
  CONDITION_ORDER,
  CONDITION_SHORT,
  MARGIN_RANGE,
  conditionOf,
  labelColor,
  signed,
  type Clip,
  type Condition,
  type ConditionId,
} from "@/lib/results";
import Tip from "./Tip";

const pos = (m: number) => Math.min(98.5, Math.max(1.5, 50 + (m / MARGIN_RANGE) * 50));
const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

// The signature visual: one marker that slides toward the line as noise rises.
export default function MarginRail({
  clip,
  active,
  live,
  onSelect,
}: {
  clip: Clip;
  active: ConditionId;
  live: Condition | null;
  onSelect: (id: ConditionId) => void;
}) {
  const orig = conditionOf(clip, "original");
  const cur = active === "live" && live ? live : conditionOf(clip, active === "live" ? "original" : active);
  const ids: ConditionId[] = live ? [...CONDITION_ORDER, "live"] : CONDITION_ORDER;
  const x0 = pos(orig.genuine_margin);
  const x1 = pos(cur.genuine_margin);
  const color = labelColor(cur.prediction);

  return (
    <div>
      <div className="relative mt-14 h-[120px]">
        <div aria-hidden className="absolute left-0 right-1/2 top-11 h-8 rounded-l-2xl bg-synthetic/10" />
        <div aria-hidden className="absolute left-1/2 right-0 top-11 h-8 rounded-r-2xl bg-genuine/10" />
        <div aria-hidden className="absolute inset-x-0 top-[59px] h-0.5 bg-line2" />
        <motion.div
          aria-hidden
          className="absolute top-[58px] h-1 rounded-full bg-ink/25"
          initial={false}
          animate={{ left: `${Math.min(x0, x1)}%`, width: `${Math.abs(x1 - x0)}%` }}
          transition={spring}
        />
        <div aria-hidden className="absolute bottom-3.5 left-1/2 top-[34px] w-0.5 -translate-x-1/2 rounded-full bg-ink2" />

        {ids
          .filter((id) => id !== active)
          .map((id) => {
            const c = id === "live" && live ? live : conditionOf(clip, id === "live" ? "original" : id);
            return (
              <motion.div
                key={id}
                className="absolute top-[45px] -translate-x-1/2"
                initial={false}
                animate={{ left: `${pos(c.genuine_margin)}%` }}
                transition={spring}
              >
                <Tip tip={`${CONDITION_SHORT[id]}: ${signed(c.genuine_margin)} · ${c.prediction}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    aria-label={`Show ${CONDITION_SHORT[id]}: margin ${signed(c.genuine_margin)}, ${c.prediction}`}
                    className="grid h-[30px] w-3 place-items-center"
                  >
                    <span className="block h-[30px] w-0.5 rounded-full bg-ink3/70" />
                  </button>
                </Tip>
              </motion.div>
            );
          })}

        <motion.span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[26px] font-medium tracking-[-0.02em]"
          initial={false}
          animate={{ left: `${x1}%`, color }}
          transition={spring}
        >
          {signed(cur.genuine_margin)}
        </motion.span>
        <motion.span
          className="absolute top-[60px] block h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_5px_#0b0c0e]"
          initial={false}
          animate={{ left: `${x1}%`, backgroundColor: color }}
          transition={spring}
        >
          {/* A single ring pulse only when the verdict actually flips */}
          <motion.span
            key={`${clip.sample_id}:${cur.prediction}`}
            aria-hidden
            className="absolute inset-0 rounded-full"
            initial={{ boxShadow: `0 0 0 0px ${color}` }}
            animate={{ boxShadow: `0 0 0 22px ${color}00` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </motion.span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[15px] font-medium">
        <span className="text-synthetic">← Synthetic</span>
        <span className="font-mono text-xs font-normal text-ink3">0</span>
        <span className="text-genuine">Genuine →</span>
      </div>
    </div>
  );
}
