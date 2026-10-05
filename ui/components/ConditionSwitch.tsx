"use client";

import { motion } from "motion/react";
import { Radio } from "lucide-react";
import { CONDITION_ORDER, CONDITION_SHORT, type ConditionId } from "@/lib/results";

const OPTIONS: ConditionId[] = [...CONDITION_ORDER, "live"];
const BARS: Record<ConditionId, number> = { original: 0, noise20: 1, noise10: 2, live: -1 };
const TITLE: Record<ConditionId, string> = {
  original: "No added noise",
  noise20: "Gentle noise. Lower dB means more noise.",
  noise10: "Strong noise. Lower dB means more noise.",
  live: "Pick any noise level",
};

export default function ConditionSwitch({
  active,
  liveOnline,
  onSelect,
  layoutKey = "cond",
  compact = false,
}: {
  active: ConditionId;
  liveOnline: boolean;
  onSelect: (id: ConditionId) => void;
  layoutKey?: string;
  compact?: boolean;
}) {
  const enabled = OPTIONS.filter((id) => id !== "live" || liveOnline || active === "live");
  const move = (e: React.KeyboardEvent) => {
    const i = enabled.indexOf(active);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") onSelect(enabled[Math.min(i + 1, enabled.length - 1)]);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") onSelect(enabled[Math.max(i - 1, 0)]);
    else return;
    e.preventDefault();
  };
  return (
    <div
      role="radiogroup"
      aria-label="Noise"
      onKeyDown={move}
      className={`grid grid-cols-4 rounded-xl border border-line bg-s2 p-1 ${compact ? "max-w-[520px]" : ""}`}
    >
      {OPTIONS.map((id) => {
        const isActive = id === active;
        const disabled = id === "live" && !liveOnline && !isActive;
        const bars = BARS[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-disabled={disabled}
            tabIndex={isActive ? 0 : -1}
            title={disabled ? "Live needs the local server: npm run dev:live" : TITLE[id]}
            onClick={() => !disabled && onSelect(id)}
            className={`relative flex h-[42px] items-center justify-center gap-2 rounded-[9px] text-[13.5px] font-medium transition-colors ${
              isActive ? "text-ink" : disabled ? "cursor-not-allowed text-ink3/40" : "text-ink3 hover:text-ink2"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`${layoutKey}-pill`}
                className="absolute inset-0 rounded-[9px] border border-line2 bg-s1 shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {bars >= 0 && !compact && (
                <span aria-hidden className="flex h-[11px] items-end gap-[2px]">
                  {[5, 8, 11].map((h, i) => (
                    <span key={h} className={`w-[3px] rounded-[1px] ${i < bars ? "bg-current" : "bg-line2"}`} style={{ height: h }} />
                  ))}
                </span>
              )}
              {id === "live" && !compact && <Radio size={14} aria-hidden />}
              {CONDITION_SHORT[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
