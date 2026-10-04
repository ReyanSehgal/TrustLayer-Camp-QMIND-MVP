"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { scoreLive } from "@/lib/live";
import type { Clip, Condition } from "@/lib/results";

const MAX_SNR = 40;

// The live noise slider. Left is quieter noise, right is louder. Debounced; stale requests are cancelled.
export default function LivePanel({
  clip,
  online,
  snr,
  onSnr,
  onResult,
}: {
  clip: Clip;
  online: boolean;
  snr: number;
  onSnr: (snr: number) => void;
  onResult: (clipId: string, c: Condition) => void;
}) {
  const [doneKey, setDoneKey] = useState("");
  const [error, setError] = useState("");

  const key = `${clip.sample_id}:${snr}`;
  const scoring = online && doneKey !== key && !error;

  useEffect(() => {
    if (!online) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const c = await scoreLive(clip.sample_id, snr, ctrl.signal);
        onResult(clip.sample_id, c);
        setDoneKey(`${clip.sample_id}:${snr}`);
        setError("");
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Scoring failed.");
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [clip.sample_id, snr, online, onResult]);

  if (!online) {
    return (
      <p className="mt-3.5 rounded-xl border border-dashed border-line2 bg-s2 px-4 py-3 text-sm text-ink2">
        Live needs the local server: <code className="font-mono text-ink">npm run dev:live</code>
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3.5 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-s2 px-4 py-3 sm:flex-nowrap sm:gap-5"
    >
      <output htmlFor="noise-level" className="min-w-16 font-mono text-lg font-medium">
        {snr} dB
      </output>
      <div className="min-w-0 flex-1">
        <input
          id="noise-level"
          type="range"
          min={0}
          max={MAX_SNR}
          step={1}
          value={MAX_SNR - snr}
          onChange={(e) => {
            setError("");
            onSnr(MAX_SNR - Number(e.target.value));
          }}
          aria-label="Noise level. Left is quieter noise, right is louder."
          aria-valuetext={`${snr} decibels signal-to-noise ratio`}
          className="range"
        />
        <div aria-hidden className="relative mx-[11px] h-5 text-[11px] text-ink3">
          {[
            [0, "quiet"],
            [50, "20"],
            [75, "10"],
            [100, "loud"],
          ].map(([p, l]) => (
            <span key={l} className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: `${p}%` }}>
              <span className="h-1.5 w-px bg-ink3" />
              {l}
            </span>
          ))}
        </div>
      </div>
      <span className="flex min-w-28 justify-end" role="status" aria-live="polite">
        {error ? (
          <span className="text-xs text-bad" title={`${error} Check that the API is still running.`}>
            Scoring failed
          </span>
        ) : scoring ? (
          <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-line2 px-2.5 text-xs font-medium text-ink2">
            <LoaderCircle size={13} className="animate-spin" />
            Scoring…
          </span>
        ) : (
          <span className="inline-flex h-[26px] items-center rounded-full border border-genuine/50 bg-genuine/10 px-2.5 text-xs font-medium">
            Live run
          </span>
        )}
      </span>
    </motion.div>
  );
}
