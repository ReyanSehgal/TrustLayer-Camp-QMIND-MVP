"""Export saved detector results for the UI.

Scores the audio the team already saved by TrustLayer/make_noisy.py
(TrustLayer/results/audio/*_original|snr20|snr10.wav) with the existing
Detector, and writes ui/public/data/results.json. Nothing is regenerated: the
numbers belong to exactly the files you can open in that folder.

Run from the TrustLayer folder with the project environment:
    .venv/bin/python ../ui/scripts/export_ui_data.py
"""
import csv
import json
import sys
from pathlib import Path

UI = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(UI))

from api import scoring  # noqa: E402


def cross_check(clips):
    """Compare against the team's own run (TrustLayer/run_noise.py -> results/noise_results.csv)."""
    path = scoring.ROOT / "results" / "noise_results.csv"
    if not path.exists():
        print("note: results/noise_results.csv not found, skipping cross-check")
        return
    by = {(c["sample_id"], x["condition"]): x for c in clips for x in c["conditions"]}
    names = {20: "noise20", 10: "noise10"}
    problems = []
    for row in csv.DictReader(path.open()):
        snr = int(row["snr_db"])
        mine = by[(row["sample_id"], "original")]
        if row["original_prediction"] != mine["prediction"] or abs(float(row["original_margin"]) - mine["genuine_margin"]) > 1e-3:
            problems.append(f"{row['sample_id']} original")
        if snr in names:
            mine = by[(row["sample_id"], names[snr])]
            if row["noisy_prediction"] != mine["prediction"] or abs(float(row["noisy_margin"]) - mine["genuine_margin"]) > 1e-3:
                problems.append(f"{row['sample_id']} {snr} dB")
    if problems:
        raise SystemExit("MISMATCH with results/noise_results.csv: " + ", ".join(problems))
    print("cross-check: agrees with results/noise_results.csv (20 dB and 10 dB rows, and clean margins)")


def main():
    (UI / "public/data").mkdir(parents=True, exist_ok=True)
    model = scoring.Detector()
    clips = []
    for sample_id, item in scoring.manifest().items():
        source, _ = scoring.window_for(item)
        scale = scoring.clip_scale(sample_id)
        conditions = []
        for name, snr in scoring.SAVED.items():
            audio = scoring.saved_audio(sample_id, name)
            conditions.append({
                "condition": name,
                "snr_db": snr,
                "seed": None if snr is None else scoring.SEED,
                **scoring.score(model, audio, scale),
                "audio_path": f"/audio/{sample_id}_{scoring.SAVED_SUFFIX[name]}.wav",
            })
        clips.append({
            "sample_id": sample_id,
            "known_label": item["label"],
            "attack_id": item["attack_id"],
            "source_url": item["source_url"],
            "source_seconds": round(len(source) / scoring.SAMPLE_RATE, 2),
            "window_seconds": round(scoring.WINDOW_SAMPLES / scoring.SAMPLE_RATE, 2),
            "window_treatment": "repeated" if len(source) < scoring.WINDOW_SAMPLES
            else "cropped" if len(source) > scoring.WINDOW_SAMPLES else "exact",
            "conditions": conditions,
        })
        print(sample_id, [c["prediction"] for c in conditions])
    cross_check(clips)
    out = {
        "meta": {
            "model": "AASIST (NAVER pretrained, not trained by this team)",
            "dataset": "ASVspoof 2019 LA evaluation showcase, 8-clip convenience subset",
            "seed": scoring.SEED,
            "status": "Saved results from TrustLayer/results/audio, scored by ui/scripts/export_ui_data.py",
        },
        "clips": clips,
    }
    (UI / "public/data/results.json").write_text(json.dumps(out, indent=1))
    print("wrote public/data/results.json")


if __name__ == "__main__":
    main()
