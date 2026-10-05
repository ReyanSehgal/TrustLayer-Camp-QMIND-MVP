"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, Mic, Upload } from "lucide-react";
import { scoreUpload, type OwnResult } from "@/lib/live";
import { signed } from "@/lib/results";
import { recordClip } from "@/lib/wav";
import { Offline } from "./SweepChart";
import Tip from "./Tip";

const RECORD_SECONDS = 4;

export default function OwnClipPanel({ online }: { online: boolean }) {
  const [source, setSource] = useState<{ blob: Blob; name: string } | null>(null);
  const [noise, setNoise] = useState<number | null>(null);
  const [result, setResult] = useState<OwnResult | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(0);
  const [drag, setDrag] = useState(false);
  const lastBlob = useRef<string | null>(null);
  const scoring = !!source && !result && !error;

  useEffect(() => () => {
    if (lastBlob.current) URL.revokeObjectURL(lastBlob.current);
  }, []);

  useEffect(() => {
    if (!source || !online) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await scoreUpload(source.blob, source.name, noise, ctrl.signal);
        if (ctrl.signal.aborted) {
          URL.revokeObjectURL(r.audio_path);
          return;
        }
        if (lastBlob.current) URL.revokeObjectURL(lastBlob.current);
        lastBlob.current = r.audio_path;
        setResult(r);
        setError("");
      } catch (e) {
        if (!ctrl.signal.aborted) {
          setError(e instanceof Error ? e.message : "Scoring failed.");
        }
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [source, noise, online]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setError("");
    setNoise(null);
    setSource({ blob: file, name: file.name });
  };

  const record = async () => {
    setError("");
    setRecording(RECORD_SECONDS);
    const tick = setInterval(() => setRecording((r) => Math.max(1, r - 1)), 1000);
    try {
      const blob = await recordClip(RECORD_SECONDS);
      setResult(null);
      setNoise(null);
      setSource({ blob, name: "recording.wav" });
    } catch {
      setError("Microphone access is blocked. Allow it from the address bar's site settings, then try again.");
    } finally {
      clearInterval(tick);
      setRecording(0);
    }
  };

  const reset = () => {
    if (lastBlob.current) URL.revokeObjectURL(lastBlob.current);
    lastBlob.current = null;
    setSource(null);
    setResult(null);
    setError("");
    setNoise(null);
  };

  if (!online) return <Offline />;

  const tile =
    "flex min-h-[150px] flex-[1_1_220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed p-5 text-ink2 transition-colors";

  return (
    <div className="mt-7">
      <AnimatePresence mode="wait">
        {!source && !recording ? (
          <motion.div key="pick" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-wrap gap-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={`${tile} ${drag ? "border-ink bg-s2" : "border-line2 hover:border-ink3 hover:bg-s2"}`}
            >
              <input type="file" accept="audio/*,.wav,.flac" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
              <Upload size={22} />
              <span className="text-[15px] font-medium text-ink">Drop a file</span>
              <span className="text-xs text-ink3">WAV or FLAC · 10 MB</span>
            </label>
            <button type="button" onClick={record} className={`${tile} border-line2 hover:border-ink3 hover:bg-s2`}>
              <Mic size={22} />
              <span className="text-[15px] font-medium text-ink">Record {RECORD_SECONDS} s</span>
              <span className="text-xs text-ink3">Microphone</span>
            </button>
          </motion.div>
        ) : recording ? (
          <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex min-h-[220px] flex-col items-center justify-center gap-3">
            <motion.span key={recording} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-6xl font-medium">
              {recording}
            </motion.span>
            <span className="flex items-center gap-2 text-sm text-ink2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-bad" />
              Recording… speak normally
            </span>
          </motion.div>
        ) : (
          <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[13px] text-ink2">
                {source?.name}
                {noise !== null && <span className="text-ink3"> · modified, {noise} dB</span>}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
                  <input
                    type="checkbox"
                    checked={noise !== null}
                    onChange={(e) => {
                      setResult(null);
                      setError("");
                      setNoise(e.target.checked ? 10 : null);
                    }}
                    className="accent-ink"
                  />
                  Noise
                </label>
                {noise !== null && (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={40 - noise}
                      onChange={(e) => {
                        setResult(null);
                        setError("");
                        setNoise(40 - Number(e.target.value));
                      }}
                      aria-label="Noise level for your audio. Left quieter, right louder."
                      aria-valuetext={`${noise} decibels signal-to-noise ratio`}
                      className="range w-36"
                    />
                    <span className="min-w-11 font-mono text-[12.5px]">{noise} dB</span>
                  </>
                )}
                <button type="button" onClick={reset} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink3 transition-colors hover:bg-s2 hover:text-ink">
                  New
                </button>
              </div>
            </div>

            {error ? (
              <p className="mt-6 text-sm text-bad">{error}</p>
            ) : !result || scoring ? (
              <p className="mt-6 flex items-center gap-2 text-sm text-ink2">
                <LoaderCircle size={15} className="animate-spin" />
                Scoring…
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-7">
                <div className="flex h-14 min-w-[240px] flex-1 items-center gap-[2px]" aria-hidden>
                  {result.peaks.map((p, i) => (
                    <span key={i} className="min-w-0 flex-1 rounded-[2px] bg-ink/60" style={{ height: `${Math.max(4, p * 100)}%` }} />
                  ))}
                </div>
                <Tip
                  tip={`Margin ${signed(result.genuine_margin)} · genuine ${signed(result.genuine_logit, 3)} · synthetic ${signed(result.synthetic_logit, 3)}. ${
                    result.window_treatment === "cropped"
                      ? `Cropped to the first ${result.window_seconds} s.`
                      : result.window_treatment === "repeated"
                        ? `Looped to fill ${result.window_seconds} s.`
                        : ""
                  } No known label, so it can't be marked right or wrong.`}
                >
                  <span
                    tabIndex={0}
                    className={`text-5xl font-semibold tracking-[-0.045em] ${result.prediction === "genuine" ? "text-genuine" : "text-synthetic"}`}
                  >
                    {result.prediction === "genuine" ? "Genuine" : "Synthetic"}
                  </span>
                </Tip>
                <audio controls src={result.audio_path} className="h-9 w-full" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {error && !source && <p className="mt-4 text-sm text-bad">{error}</p>}
    </div>
  );
}
