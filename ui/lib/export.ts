import { results } from "./results";

// Same columns the team's task board suggests for the experiment CSV.
const COLUMNS = [
  "sample_id",
  "known_label",
  "condition",
  "snr_db",
  "seed",
  "prediction",
  "synthetic_logit",
  "genuine_logit",
  "genuine_margin",
  "inference_seconds",
  "audio_path",
  "model_id",
] as const;

export function resultsCsv(): string {
  const rows = results.clips.flatMap((clip) =>
    clip.conditions.map((c) => ({
      sample_id: clip.sample_id,
      known_label: clip.known_label,
      condition: c.condition,
      snr_db: c.snr_db ?? "",
      seed: c.seed ?? "",
      prediction: c.prediction,
      synthetic_logit: c.synthetic_logit,
      genuine_logit: c.genuine_logit,
      genuine_margin: c.genuine_margin,
      inference_seconds: c.inference_seconds,
      audio_path: c.audio_path.replace(/^\/audio\//, "results/audio/"),
      model_id: "AASIST-pretrained-NAVER",
    })),
  );
  return [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((k) => r[k]).join(","))].join("\n") + "\n";
}

export function downloadCsv() {
  const url = URL.createObjectURL(new Blob([resultsCsv()], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "trustlayer_ui_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}
