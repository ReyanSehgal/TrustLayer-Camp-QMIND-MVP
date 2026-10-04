"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";

// One idea per screen. The scene crossing the middle of the viewport is sharp;
// the rest step back so the audience looks at one thing at a time.
export default function Scene({
  index,
  active,
  onActive,
  id,
  className = "",
  children,
}: {
  index: number;
  active: number;
  onActive: (i: number) => void;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  const on = active === index || active < 0;
  return (
    <motion.section
      ref={ref}
      id={id}
      data-scene={index}
      className={`relative flex min-h-[760px] scroll-mt-16 flex-col justify-center py-24 max-sm:min-h-0 max-sm:py-16 ${className}`}
      initial={false}
      animate={{ opacity: on ? 1 : 0.18, y: on ? 0 : 18, scale: on ? 1 : 0.985, filter: on ? "saturate(1)" : "saturate(0.4)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

export function Kicker({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] font-medium text-ink3">
      <span className="rounded-md border border-line2 px-1.5 py-0.5 font-mono text-xs">{n}</span>
      {children}
    </div>
  );
}

export function Title({ children, muted }: { children: ReactNode; muted?: ReactNode }) {
  return (
    <h2 className="mt-3.5 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.06] tracking-[-0.035em]">
      {children} {muted && <span className="text-ink3">{muted}</span>}
    </h2>
  );
}
