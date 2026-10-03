"""Run the 8 clips through AASIST: clean, and at 20, 10 and 0 dB SNR.

Reads the prepared audio that make_noisy.py saved in results/audio/.
make_noisy.py does not make 0 dB files, so a missing _snr0.wav is
computed in memory with the same add_white_noise(seed=42) and reported.
Missing original, 20 dB or 10 dB files are an error, not regenerated.

    python run_noise.py                     # all 8 clips -> results/noise_results.csv (24 rows)
    python run_noise.py --sample genuine_1  # one clip, printed only
"""
import argparse
import csv
import json

import numpy as np
import soundfile as sf

from detector import ROOT, SAMPLE_RATE, WINDOW_SAMPLES, Detector
from noise_reference import add_white_noise

AUDIO_DIR = ROOT / "results" / "audio"
OUT_PATH = ROOT / "results" / "noise_results.csv"
SNR_LEVELS = (20, 10, 0)
SEED = 42
FIELDS = ["sample_id", "known_label", "snr_db", "original_prediction", "noisy_prediction",
          "original_margin", "noisy_margin", "peak"]


def read_prepared(path):
    if not path.exists():
        raise FileNotFoundError(f"{path} is missing. Run make_noisy.py; this runner does not regenerate it.")
    audio, sr = sf.read(path, dtype="float32")
    if sr != SAMPLE_RATE or audio.ndim != 1 or len(audio) != WINDOW_SAMPLES:
        raise ValueError(f"{path.name} is not a prepared {WINDOW_SAMPLES}-sample mono {SAMPLE_RATE} Hz clip.")
    return audio


def noisy_audio(sample_id, clean, snr):
    path = AUDIO_DIR / f"{sample_id}_snr{snr}.wav"
    if snr == 0 and not path.exists():
        return add_white_noise(clean, snr_db=snr, seed=SEED), "computed in memory"
    return read_prepared(path), path.name


def run_clip(detector, item):
    sample_id = item["sample_id"]
    clean = read_prepared(AUDIO_DIR / f"{sample_id}_original.wav")
    before = detector.predict(clean)
    rows = []
    for snr in SNR_LEVELS:
        noisy, source = noisy_audio(sample_id, clean, snr)
        after = detector.predict(noisy)
        rows.append({
            "sample_id": sample_id,
            "known_label": item["label"],
            "snr_db": snr,
            "original_prediction": before["prediction"],
            "noisy_prediction": after["prediction"],
            "original_margin": before["genuine_margin"],
            "noisy_margin": after["genuine_margin"],
            "peak": float(np.max(np.abs(noisy))),
        })
        print(f"{sample_id:<12} {snr:>3} dB  {before['prediction']:>9} -> {after['prediction']:<9}"
              f" margin {before['genuine_margin']:8.3f} -> {after['genuine_margin']:8.3f}"
              f"  peak {rows[-1]['peak']:.4f}  ({source})")
    return rows


def main():
    parser = argparse.ArgumentParser(description="Batch noise test for the 8 labelled clips.")
    parser.add_argument("--sample", help="Run one clip only, e.g. genuine_1 (prints, does not write the CSV).")
    args = parser.parse_args()

    manifest = json.loads((ROOT / "assets/manifest.json").read_text())
    if args.sample:
        manifest = [item for item in manifest if item["sample_id"] == args.sample]
        if not manifest:
            parser.error(f"Unknown sample: {args.sample}")

    detector = Detector()
    rows = [row for item in manifest for row in run_clip(detector, item)]

    if not args.sample:
        with OUT_PATH.open("w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Saved {len(rows)} rows to {OUT_PATH}")
    print("Margin = genuine score - synthetic score (raw model outputs, not percentages).")


if __name__ == "__main__":
    main()
