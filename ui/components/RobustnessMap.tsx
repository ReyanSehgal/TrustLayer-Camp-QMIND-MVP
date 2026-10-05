"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { sweepLive, type SweepPoint } from "@/lib/live";
import { OUTCOME_LABEL, results, signed } from "@/lib/results";
import { Title } from "./Scene";
import { Offline } from "./SweepChart";

const SNRS = [40, 35, 30, 25, 20, 15, 10, 5, 0];

export default function RobustnessMap({ online, onPick }: { online: boolean; onPick: (clipId: string, snr: number) => void }) {
  const [data, setData] = useState<Record<string, SweepPoint[]>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setRunning(true);
    setError("");
    setData({});
    try {
      for (const clip of results.clips) {
        const points = await sweepLive(clip.sample_id, SNRS);
        setData((d) => ({ ...d, [clip.sample_id]: [...points].sort((a, b) => b.snr_db - a.snr_db) }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep failed.");
    } finally {
      setRunning(false);
    }
  };

  const done = Object.keys(data).length;
  const finished = done === results.clips.length;
  const genuine = results.clips.filter((c) => c.known_label === "genuine");
  const synthetic = results.clips.filter((c) => c.known_label === "synthetic");
  const hit = (ids: typeof genuine) => ids.filter((c) => data[c.sample_id]?.some((p) => p.prediction !== c.known_label)).length;

  const title = finished
    ? `${hit(genuine)} of ${genuine.length} genuine clips are flagged synthetic at some level. ${hit(synthetic)} of ${synthetic.length} synthetic clips pass as genuine.`
    : "Every clip, every noise level.";

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
            {running ? `Scoring clip ${done + 1} of ${results.clips.length}…` : finished ? "Run again" : "Run map"}
          </button>
        )}
      </div>

      {!online ? (
        <Offline />
      ) : (
        <>
          <div className="scrollbar-none mt-8 overflow-x-auto pt-1">
            <div className="min-w-[680px]">
              <div className="mb-2 grid grid-cols-[120px_repeat(9,minmax(0,1fr))] gap-1 text-center font-mono text-[11.5px] text-ink3">
                <span />
                {SNRS.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              {results.clips.map((clip) => (
                <div key={clip.sample_id} className="mb-1 grid grid-cols-[120px_repeat(9,minmax(0,1fr))] gap-1">
                  <span className="self-center font-mono text-[12.5px] text-ink2">{clip.sample_id}</span>
                  {SNRS.map((s, i) => {
                    const p = data[clip.sample_id]?.[i];
                    if (!p) return <span key={s} className="h-9 rounded-lg bg-s2" />;
                    const wrong = p.prediction !== clip.known_label;
                    const o = wrong ? (clip.known_label === "genuine" ? "false_alarm" : "missed") : "correct";
                    const label = `${clip.sample_id} · ${s} dB · ${p.prediction} ${signed(p.genuine_margin)}${wrong ? ` · ${OUTCOME_LABEL[o]}` : ""}`;
                    return (
                      <span key={s} className="tw w-full">
                        <motion.button
                          type="button"
                          onClick={() => onPick(clip.sample_id, s)}
                          aria-label={`${label}. Open as live run.`}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.08 }}
                          transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 24 }}
                          className={`h-9 w-full rounded-lg ${wrong ? "bg-bad/12" : p.prediction === "genuine" ? "bg-genuine/45" : "bg-synthetic/45"}`}
                          style={{ boxShadow: wrong ? "inset 0 0 0 2px #FF7A6E" : "none" }}
                        />
                        <span role="tooltip" className="tt">
                          {label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink3">
            {running && (
              <span className="flex items-center gap-2.5">
                <span className="font-mono">{done}/8</span>
                <span className="h-[3px] w-28 overflow-hidden rounded bg-s3">
                  <motion.span className="block h-full bg-ink" animate={{ width: `${(done / 8) * 100}%` }} />
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-genuine/45" />Genuine</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-synthetic/45" />Synthetic</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] shadow-[inset_0_0_0_2px_#FF7A6E]" />Wrong</span>
            <span>quieter → louder noise</span>
            {error && <span className="text-bad">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
