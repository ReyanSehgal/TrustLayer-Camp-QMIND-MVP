"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

const KEYS: [string[], string][] = [
  [["Space"], "Play / pause"],
  [["1", "2", "3", "4"], "Clean · 20 · 10 · Live"],
  [["J", "K"], "Next / previous clip"],
  [["S"], "Spectrogram"],
  [["Esc"], "Close"],
];

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,6,8,0.62)] p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="card w-[360px] max-w-full px-6 py-5"
            initial={{ y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">Shortcuts</span>
              <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-ink3 hover:bg-s2 hover:text-ink">
                <X size={16} />
              </button>
            </div>
            {KEYS.map(([keys, d]) => (
              <div key={d} className="flex items-center justify-between border-t border-line py-2.5 text-[13px]">
                <span>{d}</span>
                <span className="flex gap-1">
                  {keys.map((k) => (
                    <kbd key={k} className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line2 px-1.5 font-mono text-[10.5px] text-ink3">
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
