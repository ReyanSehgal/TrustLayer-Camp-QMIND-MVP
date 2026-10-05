"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { ArrowDown, AudioWaveform, Keyboard } from "lucide-react";
import { checkApi } from "@/lib/live";
import { conditionOf, results, type Condition, type ConditionId } from "@/lib/results";
import ClipList from "./ClipList";
import ConditionSwitch from "./ConditionSwitch";
import LivePanel from "./LivePanel";
import MarginRail from "./MarginRail";
import OwnClipPanel from "./OwnClipPanel";
import ResultsMatrix from "./ResultsMatrix";
import RobustnessMap from "./RobustnessMap";
import Scene, { Kicker, Title } from "./Scene";
import ShortcutHelp from "./ShortcutHelp";
import SweepChart from "./SweepChart";
import Tip from "./Tip";
import Verdict from "./Verdict";
import WaveformPlayer from "./WaveformPlayer";

function useApiOnline() {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const ok = await checkApi();
      if (alive) setOnline(ok);
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return online;
}

const SAVED_KEYS: Record<string, ConditionId> = { "1": "original", "2": "noise20", "3": "noise10" };
const SCENES = ["Intro", "Listen", "How far it leans", "All eight clips", "Where it flips", "Every level", "Your audio"];

export default function Workbench() {
  const [clipId, setClipId] = useState("genuine_2");
  const [condId, setCondId] = useState<ConditionId>("original");
  const [liveSnr, setLiveSnr] = useState(15);
  const [liveResult, setLiveResult] = useState<{ clipId: string; cond: Condition } | null>(null);
  const [help, setHelp] = useState(false);
  const [active, setActive] = useState(0);
  const online = useApiOnline();
  const lastBlob = useRef<string | null>(null);

  const clip = results.clips.find((c) => c.sample_id === clipId) ?? results.clips[0];
  const live = liveResult && liveResult.clipId === clipId && liveResult.cond.snr_db === liveSnr ? liveResult.cond : null;
  const livePending = condId === "live" && (!live || !online);
  const showing: ConditionId = condId === "live" && live ? "live" : condId === "live" ? "original" : condId;
  const cond = showing === "live" && live ? live : conditionOf(clip, showing === "live" ? "original" : showing);

  const onLiveResult = useCallback((id: string, c: Condition) => {
    if (lastBlob.current) URL.revokeObjectURL(lastBlob.current);
    lastBlob.current = c.audio_path;
    setLiveResult({ clipId: id, cond: c });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      const step = (d: number) =>
        setClipId((id) => {
          const i = results.clips.findIndex((c) => c.sample_id === id);
          return results.clips[(i + d + results.clips.length) % results.clips.length].sample_id;
        });
      if (e.key in SAVED_KEYS) setCondId(SAVED_KEYS[e.key]);
      else if (e.key === "4" && online) setCondId("live");
      else if (e.key === "j" || e.key === "J") step(1);
      else if (e.key === "k" || e.key === "K") step(-1);
      else if (e.key === "s" || e.key === "S") window.dispatchEvent(new Event("tl:toggle-view"));
      else if (e.key === "?") setHelp((h) => !h);
      else if (e.key === "Escape") setHelp(false);
      else if (e.key === " " && t === document.body) {
        e.preventDefault();
        window.dispatchEvent(new Event("tl:toggle-play"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [online]);

  const goScene = (i: number) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(`[data-scene="${i}"]`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  const open = (id: string, k: ConditionId, snr?: number) => {
    setClipId(id);
    if (snr !== undefined) setLiveSnr(snr);
    setCondId(k);
    goScene(1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-4 px-8 max-sm:px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-bg">
              <AudioWaveform size={15} strokeWidth={2.3} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em]">TrustLayer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tip tip={online ? "Live scoring server running on localhost:8000." : "Saved results still work. Start live scoring with: npm run dev:live"}>
              <span role="status" tabIndex={0} className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-line2 px-2.5 text-xs font-medium text-ink2">
                <span className={`h-[7px] w-[7px] rounded-full ${online ? "animate-pulse bg-ok" : "border-[1.5px] border-ink3"}`} />
                {online ? "Live" : "Offline"}
              </span>
            </Tip>
            <button
              type="button"
              onClick={() => setHelp((h) => !h)}
              aria-label="Keyboard shortcuts (?)"
              className="grid h-9 w-9 place-items-center rounded-[10px] text-ink3 transition-colors hover:bg-s2 hover:text-ink"
            >
              <Keyboard size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Sections" className="fixed right-[22px] top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1.5 max-md:hidden">
        {SCENES.map((name, i) => (
          <button key={name} type="button" onClick={() => goScene(i)} aria-label={name} className="group flex h-[22px] items-center justify-end gap-2.5">
            <span className="translate-x-1.5 whitespace-nowrap text-xs text-ink2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100">
              {name}
            </span>
            <motion.span
              className="block h-2 w-2 rounded-full"
              animate={{ backgroundColor: active === i ? "#EDEEF0" : "#30353C", scale: active === i ? 1.35 : 1 }}
            />
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-[1200px] px-8 max-sm:px-4">
        <Scene index={0} active={active} onActive={setActive}>
          <h1 className="text-[clamp(44px,7vw,92px)] font-semibold leading-[0.98] tracking-[-0.05em]">
            Same voice.
            <br />
            Same model.
            <br />
            <span className="text-ink3">Different verdict.</span>
          </h1>
          <p className="mt-7 text-lg text-ink2">A deepfake detector, before and after a bit of noise.</p>
          <motion.button
            type="button"
            onClick={() => goScene(1)}
            aria-label="Start"
            className="mt-14 self-start text-ink3"
            animate={{ y: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown size={22} />
          </motion.button>
        </Scene>

        <Scene index={1} active={active} onActive={setActive} id="bench">
          <Kicker n="01">Listen</Kicker>
          <div className="mt-4">
            <ClipList clipId={clipId} onSelect={setClipId} />
          </div>
          <div className="mt-3.5">
            <ConditionSwitch active={condId} liveOnline={online} onSelect={setCondId} />
          </div>
          {condId === "live" && <LivePanel key={clip.sample_id} clip={clip} online={online} snr={liveSnr} onSnr={setLiveSnr} onResult={onLiveResult} />}
          <div className="mt-5 flex flex-wrap items-stretch gap-5">
            {livePending ? (
              <p role="status" aria-live="polite" className="card w-full p-6 text-sm text-ink2">
                {online ? "Waiting for the result at this noise level…" : "Live scoring is offline. Select a saved condition to view its result."}
              </p>
            ) : (
              <>
                <WaveformPlayer key={clip.sample_id} clip={clip} cond={cond} live={live} online={online} />
                <Verdict clip={clip} cond={cond} />
              </>
            )}
          </div>
        </Scene>

        <Scene index={2} active={active} onActive={setActive}>
          <Kicker n="02">How far it leans</Kicker>
          <Title muted="and sometimes the verdict.">Noise can change the score</Title>
          <div className="mt-8">
            <ConditionSwitch active={condId} liveOnline={online} onSelect={setCondId} layoutKey="cond-rail" compact />
          </div>
          {livePending ? (
            <p role="status" aria-live="polite" className="mt-8 text-sm text-ink2">
              {online ? "Waiting for the result at this noise level…" : "Select a saved condition while live scoring is offline."}
            </p>
          ) : (
            <MarginRail clip={clip} active={showing} live={live} onSelect={setCondId} />
          )}
          <p className="mt-7 text-[13px] text-ink3">
            <span className="font-mono text-ink2">{clip.sample_id}</span> · margin = genuine score − synthetic score. It shows a lean, not a confidence.
          </p>
        </Scene>

        <Scene index={3} active={active} onActive={setActive}>
          <Kicker n="03">All eight clips</Kicker>
          <Title muted="Strong noise: two real voices flagged synthetic.">Clean and gentle noise: all right.</Title>
          <ResultsMatrix clipId={clipId} condId={condId} onSelect={(c, k) => open(c, k)} />
        </Scene>

        <Scene index={4} active={active} onActive={setActive}>
          <Kicker n="04">Where it flips</Kicker>
          <SweepChart clip={clip} online={online} onPick={(snr) => open(clip.sample_id, "live", snr)} />
        </Scene>

        <Scene index={5} active={active} onActive={setActive}>
          <Kicker n="05">Every clip, every level</Kicker>
          <RobustnessMap online={online} onPick={(id, snr) => open(id, "live", snr)} />
        </Scene>

        <Scene index={6} active={active} onActive={setActive} className="!min-h-[620px]">
          <Kicker n="06">
            Your own audio
            <Tip tip="The model was tested on studio speech. Mic or phone audio is outside that, and there's no known label, so it can't be marked right or wrong.">
              <span tabIndex={0} className="ml-1 inline-flex h-[26px] items-center rounded-full border border-line2 px-2.5 text-xs font-medium text-ink2">
                Experimental
              </span>
            </Tip>
          </Kicker>
          <p className="mt-3 text-sm text-ink3">
            Experimental: this model was evaluated on studio speech. Microphone and phone recordings may behave differently.
            Your audio has no known label here, so a prediction cannot be marked correct or incorrect.
          </p>
          <OwnClipPanel online={online} />
        </Scene>

        <footer className="flex flex-wrap justify-between gap-x-6 gap-y-3 border-t border-line pb-10 pt-7 text-[12.5px] text-ink3">
          <span>Detector: AASIST, pretrained by NAVER (MIT). We didn&apos;t train it. · Clips: ASVspoof 2019 LA (ODC-By)</span>
          <span>8 clips, not a benchmark · seed 42</span>
        </footer>
      </main>

      <ShortcutHelp open={help} onClose={() => setHelp(false)} />
    </MotionConfig>
  );
}
