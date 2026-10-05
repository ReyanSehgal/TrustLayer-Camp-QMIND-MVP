import raw from "@/public/data/results.json";

export type SavedConditionId = "original" | "noise20" | "noise10";
export type ConditionId = SavedConditionId | "live";
export type Label = "genuine" | "synthetic";
export type Outcome = "correct" | "false_alarm" | "missed";

export interface Condition {
  condition: ConditionId;
  snr_db: number | null;
  seed: number | null;
  prediction: Label;
  synthetic_logit: number;
  genuine_logit: number;
  genuine_margin: number;
  inference_seconds: number;
  audio_path: string;
  peak: number;
  exceeds_full_scale: boolean;
  peaks: number[];
}

export interface Clip {
  sample_id: string;
  known_label: Label;
  attack_id: string;
  source_url: string;
  source_seconds: number;
  window_seconds: number;
  window_treatment: "repeated" | "cropped" | "exact";
  conditions: Condition[];
}

export interface Results {
  meta: { model: string; dataset: string; seed: number; status: string };
  clips: Clip[];
}

export const results = raw as unknown as Results;

export const CONDITION_ORDER: SavedConditionId[] = ["original", "noise20", "noise10"];

export const CONDITION_LABEL: Record<ConditionId, string> = {
  original: "Original",
  noise20: "20 dB noise",
  noise10: "10 dB noise",
  live: "Live noise",
};

export const CONDITION_SHORT: Record<ConditionId, string> = {
  original: "Clean",
  noise20: "20 dB",
  noise10: "10 dB",
  live: "Live",
};

export function conditionOf(clip: Clip, id: SavedConditionId): Condition {
  return clip.conditions.find((c) => c.condition === id) ?? clip.conditions[0];
}

// Genuine clip flagged synthetic = false alarm; synthetic clip passed as genuine = missed.
export function outcomeOf(clip: Clip, c: Condition): Outcome {
  if (c.prediction === clip.known_label) return "correct";
  return clip.known_label === "genuine" ? "false_alarm" : "missed";
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  correct: "Correct",
  false_alarm: "False alarm",
  missed: "Missed synthetic",
};

// One shared margin scale so every clip is comparable on the rail.
export const MARGIN_RANGE =
  Math.ceil(
    Math.max(...results.clips.flatMap((c) => c.conditions.map((x) => Math.abs(x.genuine_margin)))),
  ) + 1;

export function summarize(id: SavedConditionId) {
  let correct = 0;
  let falseAlarms = 0;
  let missed = 0;
  for (const clip of results.clips) {
    const o = outcomeOf(clip, conditionOf(clip, id));
    if (o === "correct") correct += 1;
    else if (o === "false_alarm") falseAlarms += 1;
    else missed += 1;
  }
  return { correct, total: results.clips.length, falseAlarms, missed };
}

export function signed(n: number, digits = 2) {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;
}

export const COLOR = {
  ink: "#EDEEF0",
  ink3: "#878E97",
  genuine: "#6AA6FF",
  synthetic: "#F2B14C",
  bad: "#FF7A6E",
  ok: "#4CC38A",
};

export function labelColor(l: Label) {
  return l === "genuine" ? COLOR.genuine : COLOR.synthetic;
}
