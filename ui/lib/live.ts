import type { Condition, Label } from "./results";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ScoreResponse {
  sample_id: string;
  snr_db: number | null;
  seed: number | null;
  prediction: Label;
  synthetic_logit: number;
  genuine_logit: number;
  genuine_margin: number;
  inference_seconds: number;
  peak: number;
  exceeds_full_scale: boolean;
  peaks: number[];
  audio_b64: string;
}

export interface SweepPoint {
  snr_db: number;
  prediction: Label;
  genuine_margin: number;
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`Scoring failed (${res.status}).`);
  return res.json();
}

export async function checkApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function toBlobUrl(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}

export async function scoreLive(
  sampleId: string,
  snrDb: number,
  signal?: AbortSignal,
): Promise<Condition> {
  const r = await post<ScoreResponse>("/api/score", { sample_id: sampleId, snr_db: snrDb }, signal);
  const { audio_b64, ...rest } = r;
  return {
    ...rest,
    snr_db: r.snr_db,
    seed: r.seed,
    condition: "live",
    audio_path: toBlobUrl(audio_b64),
  };
}

export async function sweepLive(
  sampleId: string,
  snrValues: number[],
  signal?: AbortSignal,
): Promise<SweepPoint[]> {
  const r = await post<{ points: SweepPoint[] }>(
    "/api/sweep",
    { sample_id: sampleId, snr_values: snrValues },
    signal,
  );
  return r.points;
}

export interface SensitivitySegment {
  start_s: number;
  end_s: number;
  margin_without: number;
  pull: number;
}

export async function sensitivityLive(
  sampleId: string,
  snrDb: number | null,
  segments = 16,
  signal?: AbortSignal,
): Promise<{ base_margin: number; segments: SensitivitySegment[] }> {
  return post("/api/sensitivity", { sample_id: sampleId, snr_db: snrDb, segments }, signal);
}

export interface OwnResult extends Condition {
  filename: string;
  source_seconds: number;
  window_seconds: number;
  window_treatment: "repeated" | "cropped" | "exact";
}

export async function scoreUpload(
  file: Blob,
  filename: string,
  snrDb: number | null,
  signal?: AbortSignal,
): Promise<OwnResult> {
  const form = new FormData();
  form.append("file", file, filename);
  if (snrDb !== null) form.append("snr_db", String(snrDb));
  const res = await fetch(`${API_URL}/api/score_upload`, { method: "POST", body: form, signal });
  if (!res.ok) {
    const detail = await res.json().then((j) => j.detail).catch(() => null);
    throw new Error(typeof detail === "string" ? detail : `Scoring failed (${res.status}).`);
  }
  const { audio_b64, ...rest } = await res.json();
  return { ...rest, condition: "live", audio_path: toBlobUrl(audio_b64) };
}
