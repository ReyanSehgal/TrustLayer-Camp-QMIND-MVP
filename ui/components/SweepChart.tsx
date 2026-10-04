"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { sweepLive, type SweepPoint } from "@/lib/live";
import { MARGIN_RANGE, signed, type Clip } from "@/lib/results";
import { Title } from "./Scene";

const SNRS = [40, 35, 30, 25, 20, 15, 10, 5, 0];

// "Where does it flip?" for the current clip. The answer becomes the title.
export default function SweepChart({ clip, online, onPick }: { clip: Clip; online: boolean; onPick: (snr: number) => void }) {
  const [sweep, setSweep] = useState<{ clipId: string; points: SweepPoint[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setRunning(true);
    setError("");
    try {
      setSweep({ clipId: clip.sample_id, points: await sweepLive(clip.sample_id, SNRS) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep failed.");
    } finally {
      setRunning(false);
    }
  };

  const pts = sweep && sweep.clipId === clip.sample_id ? [...sweep.points].sort((a, b) => b.snr_db - a.snr_db) : null;
  const hi = pts ? pts[0].snr_db : 40;
  const lo = pts ? pts[pts.length - 1].snr_db : 0;
  const x = (s: number) => ((hi - s) / (hi - lo || 1)) * 100;
  const y = (m: number) => 50 - (Math.max(-MARGIN_RANGE, Math.min(MARGIN_RANGE, m)) / MARGIN_RANGE) * 50;
  const flips: [SweepPoint, SweepPoint][] = [];
  if (pts) for (let i = 1; i < pts.length; i++) if (pts[i].prediction !== pts[i - 1].prediction) flips.push([pts[i - 1], pts[i]]);

  const title = !pts
    ? `Where does ${clip.sample_id} flip?`
    : flips.length
      ? `It flips between ${flips.map(([a, b]) => `${a.snr_db} and ${b.snr_db} dB`).join(", then ")}.`
      : `No flip for ${clip.sample_id}, down to ${lo} dB.`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Title>{title}</Title>
        {online && (
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex h-9 items-center rounded-[10px] border border-line2 bg-s1 px-3.5 text-[13px] font-medium transition-colors hover:bg-s3 disabled:opacity-50"
          >
            {running ? "Scoring…" : pts ? "Run again" : "Run sweep"}
          </button>
        )}
      </div>

      {!online ? (
        <Offline />
      ) : (
        <>
          <div className="relative mt-8 h-[300px]">
            <div className="absolute inset-x-0 bottom-7 top-0">
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-genuine/[0.06]" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-xl bg-synthetic/[0.06]" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-ink3" />
              <span className="absolute left-3.5 top-2.5 text-xs font-medium text-genuine">Genuine</span>
              <span className="absolute bottom-2.5 left-3.5 text-xs font-medium text-synthetic">Synthetic</span>
              {pts &&
                flips.map(([a, b]) => (
                  <motion.div
                    key={a.snr_db}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="absolute inset-y-0 border-x border-dashed border-bad bg-bad/10"
                    style={{ left: `${x(a.snr_db)}%`, width: `${x(b.snr_db) - x(a.snr_db)}%` }}
                  >
                    <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-medium text-bad">flip</span>
                  </motion.div>
                ))}
              {pts && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                  <motion.polyline
                    points={pts.map((p) => `${x(p.snr_db)},${y(p.genuine_margin)}`).join(" ")}
                    fill="none"
                    stroke="#EDEEF0"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
              )}
              {pts?.map((p, i) => {
                const wrong = p.prediction !== clip.known_label;
                const label = `${p.snr_db} dB: ${p.prediction}, margin ${signed(p.genuine_margin)}. Open as live run.`;
                return (
                  <motion.button
                    key={p.snr_db}
                    type="button"
                    onClick={() => onPick(p.snr_db)}
                    aria-label={label}
                    title={label}
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.4 }}
                    transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
                    className={`absolute -ml-[7px] -mt-[7px] h-3.5 w-3.5 rounded-full border-[3px] border-bg ${p.prediction === "genuine" ? "bg-genuine" : "bg-synthetic"}`}
                    style={{ left: `${x(p.snr_db)}%`, top: `${y(p.genuine_margin)}%`, boxShadow: wrong ? "0 0 0 2px #FF7A6E" : "none" }}
                  />
                );
              })}
              {running && <div className="scan rounded-xl" />}
              {!pts && !running && (
                <div className="absolute inset-0 grid place-items-center text-sm text-ink3">
                  {error ? <span className="text-bad">{error}</span> : <span>Run the sweep for <span className="font-mono text-ink2">{clip.sample_id}</span></span>}
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-4.5">
              {SNRS.map((s) => (
                <span key={s} className="absolute -translate-x-1/2 font-mono text-[11.5px] text-ink3" style={{ left: `${((40 - s) / 40) * 100}%` }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[12.5px] text-ink3">
            <span>← quieter noise</span>
            <span>SNR, dB · lower = more noise</span>
            <span>louder noise →</span>
          </div>
          <p className="mt-6 text-[13px] text-ink3">One clip, one noise seed (42). An illustration, not a threshold.</p>
        </>
      )}
    </div>
  );
}

export function Offline() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-line2 bg-s2 px-5 py-4">
      <span className="text-ink2">Needs the live server</span>
      <code className="rounded-lg border border-line2 bg-bg px-3 py-1.5 font-mono text-[13px]">npm run dev:live</code>
    </div>
  );
}
