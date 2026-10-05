"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AudioLines, FlaskConical, Pause, Play } from "lucide-react";
import { CONDITION_ORDER, conditionOf, type Clip, type Condition, type ConditionId } from "@/lib/results";
import SensitivityStrip from "./SensitivityStrip";
import Spectrogram from "./Spectrogram";
import Tip from "./Tip";

const W = 960;
const H = 200;
const MID = H / 2;
const STEP = W / 160;

export default function WaveformPlayer({
  clip,
  cond,
  live,
  online,
}: {
  clip: Clip;
  cond: Condition;
  live: Condition | null;
  online: boolean;
}) {
  const els = useRef<Partial<Record<string, HTMLAudioElement | null>>>({});
  const cursor = useRef<SVGLineElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const prev = useRef(cond.condition);
  const [playing, setPlaying] = useState(false);
  const [playedIdx, setPlayedIdx] = useState(0);
  const [view, setView] = useState<"wave" | "spec">("wave");
  const [sens, setSens] = useState(false);

  const active = cond.condition;
  const audioIds: ConditionId[] = live ? [...CONDITION_ORDER, "live"] : CONDITION_ORDER;
  const original = conditionOf(clip, "original");
  const isNoisy = active !== "original";

  const sync = useCallback(() => {
    const a = els.current[active];
    if (!a) return;
    const dur = a.duration || clip.window_seconds;
    const f = Math.min(1, a.currentTime / dur);
    cursor.current?.setAttribute("x1", String(f * W));
    cursor.current?.setAttribute("x2", String(f * W));
    if (clock.current) clock.current.textContent = a.currentTime.toFixed(2);
    setPlayedIdx(Math.floor(f * 160));
  }, [active, clip.window_seconds]);

  // A/B: keep the playhead (and play state) when the condition changes.
  useEffect(() => {
    if (prev.current === active) return;
    const from = els.current[prev.current];
    const to = els.current[active];
    if (from && to) {
      const t = from.currentTime;
      const was = !from.paused;
      from.pause();
      to.currentTime = t;
      if (was) to.play().catch(() => setPlaying(false));
    }
    prev.current = active;
    sync();
  }, [active, sync]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      sync();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, sync]);

  const toggle = useCallback(() => {
    const a = els.current[active];
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [active]);

  useEffect(() => {
    const onPlay = () => toggle();
    const onView = () => setView((v) => (v === "wave" ? "spec" : "wave"));
    window.addEventListener("tl:toggle-play", onPlay);
    window.addEventListener("tl:toggle-view", onView);
    return () => {
      window.removeEventListener("tl:toggle-play", onPlay);
      window.removeEventListener("tl:toggle-view", onView);
    };
  }, [toggle]);

  const seek = (e: React.PointerEvent<SVGSVGElement>) => {
    const a = els.current[active];
    if (!a) return;
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    a.currentTime = f * (a.duration || clip.window_seconds);
    sync();
  };

  const audioSrc = (id: ConditionId) => (id === "live" ? live?.audio_path : conditionOf(clip, id).audio_path);
  const repeats: number[] = [];
  if (clip.window_treatment === "repeated")
    for (let k = 1; k * clip.source_seconds < clip.window_seconds; k++) repeats.push((k * clip.source_seconds) / clip.window_seconds);

  const windowText =
    clip.window_treatment === "exact"
      ? `The model hears ${clip.window_seconds} s. This clip fits exactly.`
      : clip.window_treatment === "cropped"
        ? `The model hears ${clip.window_seconds} s. This ${clip.source_seconds} s clip is cropped to its first ${clip.window_seconds} s.`
        : `The model hears ${clip.window_seconds} s. This ${clip.source_seconds} s clip is repeated to fill it (dashed line).`;

  const iconBtn = (on: boolean) =>
    `grid h-9 w-9 place-items-center rounded-[10px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      on ? "border-ink3 bg-s3 text-ink" : "border-line2 bg-s1 text-ink2 hover:bg-s3"
    }`;

  return (
    <div className="card min-w-0 flex-[1.8_1_520px] px-6 pb-5 pt-6">
      <div className="relative h-[170px]">
        {view === "spec" && <Spectrogram key={cond.audio_path} src={cond.audio_path} />}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full cursor-pointer touch-none overflow-visible"
          role="img"
          aria-label={`${view === "wave" ? "Waveform" : "Spectrogram"} of ${clip.sample_id}, ${isNoisy ? "with added noise" : "original"}. Click to seek.`}
          onPointerDown={seek}
          preserveAspectRatio="none"
        >
          <g style={{ opacity: view === "wave" ? 1 : 0, transition: "opacity 0.25s" }}>
            {cond.peaks.map((p, i) => {
              const h = Math.max(3, (isNoisy ? p : original.peaks[i]) * (H - 12));
              return (
                <motion.rect
                  key={`h${i}`}
                  x={i * STEP + 0.8}
                  width={STEP - 2}
                  rx={1.4}
                  fill="#EDEEF0"
                  fillOpacity={i < playedIdx ? 0.34 : 0.17}
                  initial={false}
                  animate={{ y: MID - h / 2, height: h }}
                  transition={{ type: "spring", stiffness: 200, damping: 28 }}
                />
              );
            })}
            {original.peaks.map((p, i) => {
              const h = Math.max(3, p * (H - 12));
              return (
                <motion.rect
                  key={`c${i}`}
                  x={i * STEP + 0.8}
                  width={STEP - 2}
                  rx={1.4}
                  fill="#EDEEF0"
                  fillOpacity={i < playedIdx ? 1 : 0.34}
                  initial={{ y: MID, height: 0 }}
                  animate={{ y: MID - h / 2, height: h }}
                  transition={{ type: "spring", stiffness: 220, damping: 28, delay: i * 0.0018 }}
                />
              );
            })}
            {repeats.map((f) => (
              <line key={f} x1={f * W} x2={f * W} y1={-6} y2={H + 6} stroke="#30353C" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          <line ref={cursor} x1={0} x2={0} y1={-8} y2={H + 8} stroke="#EDEEF0" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {sens && online && <SensitivityStrip key={`${clip.sample_id}:${cond.condition}:${cond.snr_db}`} clip={clip} cond={cond} />}

      {audioIds.map((id) => (
        <audio
          key={id}
          ref={(el) => {
            els.current[id] = el;
          }}
          src={audioSrc(id)}
          preload="auto"
          onPlay={() => id === active && setPlaying(true)}
          onPause={() => id === active && setPlaying(false)}
          onEnded={() => id === active && setPlaying(false)}
          onEmptied={() => id === active && setPlaying(false)}
        />
      ))}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <motion.button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="grid h-[46px] w-[46px] place-items-center rounded-full bg-ink text-bg"
        >
          {playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} className="ml-0.5" />}
        </motion.button>
        <span className="font-mono text-[13px] text-ink2">
          <span ref={clock}>0.00</span> <span className="text-ink3">/ {clip.window_seconds.toFixed(2)} s</span>
        </span>
        <span className="flex-1" />
        {isNoisy && (
          <Tip
            tip={`White noise added at ${cond.snr_db} dB SNR, seed ${cond.seed}. Solid bars are the original, the haze is the noise. The source file is unchanged.${
              cond.exceeds_full_scale ? " Playback may clip; the model input was not clipped." : ""
            }`}
          >
            <span tabIndex={0} className="inline-flex h-[26px] items-center rounded-full border border-line2 bg-s3 px-2.5 text-xs font-medium">
              Modified · {cond.snr_db} dB
            </span>
          </Tip>
        )}
        <Tip tip={windowText}>
          <span tabIndex={0} className="inline-flex h-[26px] items-center rounded-full border border-line2 px-2.5 text-xs font-medium text-ink2">
            {clip.window_treatment === "cropped" ? "Cropped" : clip.window_treatment === "repeated" ? "Looped" : "Exact"} to {clip.window_seconds} s
          </span>
        </Tip>
        <Tip tip="Spectrogram (S). Fixed −100 to −20 dBFS scale, so noise really looks brighter.">
          <button type="button" aria-label="Spectrogram" aria-pressed={view === "spec"} onClick={() => setView((v) => (v === "wave" ? "spec" : "wave"))} className={iconBtn(view === "spec")}>
            <AudioLines size={16} />
          </button>
        </Tip>
        <Tip tip={online ? "Sensitivity (experimental): mutes one slice at a time. Shows where the score is sensitive, not why." : "Needs the live server: npm run dev:live"}>
          <button type="button" aria-label="Sensitivity map, experimental" aria-pressed={sens} disabled={!online} onClick={() => setSens((s) => !s)} className={iconBtn(sens)}>
            <FlaskConical size={16} />
          </button>
        </Tip>
      </div>
    </div>
  );
}
