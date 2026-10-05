"use client";

import { useEffect, useRef, useState } from "react";
import { computeSpectrogram, decodeToMono16k } from "@/lib/spectrogram";

// Mount with key={src} so a new clip starts clean.
export default function Spectrogram({ src }: { src: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const spec = computeSpectrogram(await decodeToMono16k(src));
        if (!alive || !canvas.current) return;
        canvas.current.width = spec.frames;
        canvas.current.height = spec.bins;
        canvas.current.getContext("2d")?.putImageData(new ImageData(spec.rgba, spec.frames, spec.bins), 0, 0);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg bg-bg">
      <canvas ref={canvas} className="h-full w-full" aria-hidden />
      {state !== "ready" && (
        <p className="absolute inset-0 grid place-items-center text-center text-xs text-ink3">
          {state === "loading" ? "Computing spectrogram…" : "Couldn't decode this audio. The waveform still works."}
        </p>
      )}
      {state === "ready" && (
        <>
          <span aria-hidden className="absolute left-2 top-1.5 font-mono text-[10.5px] text-white/70">8 kHz</span>
          <span aria-hidden className="absolute bottom-1.5 left-2 font-mono text-[10.5px] text-white/70">0</span>
        </>
      )}
    </div>
  );
}
