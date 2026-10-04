"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { sensitivityLive, type SensitivitySegment } from "@/lib/live";
import { signed, type Clip, type Condition } from "@/lib/results";

// Experimental. Runs as soon as it is shown; mount with a key per clip + condition.
export default function SensitivityStrip({ clip, cond }: { clip: Clip; cond: Condition }) {
  const [data, setData] = useState<{ base: number; segments: SensitivitySegment[] } | null>(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    sensitivityLive(clip.sample_id, cond.snr_db, 16, ctrl.signal)
      .then((r) => setData({ base: r.base_margin, segments: r.segments }))
      .catch((e) => !ctrl.signal.aborted && setError(e instanceof Error ? e.message : "Could not run the test."));
    return () => ctrl.abort();
  }, [clip.sample_id, cond.snr_db]);

  if (error) return <p className="mt-3.5 text-xs text-bad">{error}</p>;
  if (!data)
    return (
      <div className="relative mt-3.5 h-4 rounded bg-s2" aria-label="Muting 16 slices one at a time">
        <div className="scan" />
      </div>
    );

  const max = Math.max(...data.segments.map((s) => Math.abs(s.pull)), 1e-6);
  const h = hover !== null ? data.segments[hover] : null;
  return (
    <div className="mt-3.5">
      <div className="flex h-4 gap-[2px]" onMouseLeave={() => setHover(null)}>
        {data.segments.map((s, i) => {
          const label = `${s.start_s.toFixed(2)}–${s.end_s.toFixed(2)} s: muted, margin ${signed(s.margin_without)}; pulls toward ${s.pull >= 0 ? "genuine" : "synthetic"}`;
          return (
            <motion.button
              key={i}
              type="button"
              aria-label={label}
              title={label}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              className={`h-full min-w-0 flex-1 rounded-[3px] ${s.pull >= 0 ? "bg-genuine" : "bg-synthetic"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.14 + 0.86 * (Math.abs(s.pull) / max), scaleY: hover === i ? 1.3 : 1 }}
              transition={{ delay: hover === null ? i * 0.025 : 0, duration: 0.3 }}
            />
          );
        })}
      </div>
      <p className="mt-2 min-h-4 font-mono text-[11.5px] text-ink3" aria-live="polite">
        {h
          ? `${h.start_s.toFixed(2)}–${h.end_s.toFixed(2)} s · without it ${signed(h.margin_without)} (now ${signed(data.base)})`
          : "Experimental · shows where the score is sensitive, not why"}
      </p>
    </div>
  );
}
