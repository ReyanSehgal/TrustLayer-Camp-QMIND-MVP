"""Run one TrustLayer recording with an optional noise comparison.

Place beside the outer .venv folder or beside detector.py.
With the project environment activated:
    python demo.py
    python demo.py --noise 10
    python demo.py --sample genuine_2 --noise 10
"""
import argparse
import json
import math
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description="Test one labelled speech recording.")
    parser.add_argument("--sample", default="genuine_1", help="Example: genuine_1 or synthetic_1")
    parser.add_argument("--noise", type=float, default=None, metavar="SNR_DB",
                        help="Add noise at this SNR; lower numbers mean stronger noise.")
    args = parser.parse_args()
    if args.noise is not None and not math.isfinite(args.noise):
        parser.error("Noise SNR must be a finite number, such as 10 or 20.")

    here = Path(__file__).resolve().parent
    candidates = [here, here / "TrustLayer_Camp_Starter"]
    root = next((p for p in candidates if (p / "detector.py").is_file()), None)
    if root is None:
        parser.error("Move demo.py into the starter folder beside .venv, or beside detector.py.")
    sys.path.insert(0, str(root))

    import soundfile as sf
    from detector import Detector, load_audio, model_window
    from noise_reference import add_white_noise

    manifest = json.loads((root / "assets/manifest.json").read_text())
    item = next((row for row in manifest if row["sample_id"] == args.sample), None)
    if item is None:
        parser.error("Choose one of: " + ", ".join(row["sample_id"] for row in manifest))

    results_dir = root / "results"
    results_dir.mkdir(exist_ok=True)
    original = model_window(load_audio(root / item["path"]))
    original_path = results_dir / f"{args.sample}_window.wav"
    sf.write(original_path, original, 16000, subtype="FLOAT")

    model = Detector()
    before = model.predict(original)
    print(f"Recording: {args.sample}")
    print(f"Known label: {item['label']}")
    print(f"Original: {before['prediction']} | genuine margin {before['genuine_margin']:.3f}")
    print(f"Original audio: {original_path}")

    if args.noise is not None:
        noisy = add_white_noise(original, snr_db=args.noise, seed=42)
        noisy_path = results_dir / f"{args.sample}_noisy.wav"
        sf.write(noisy_path, noisy, 16000, subtype="FLOAT")
        after = model.predict(noisy)
        print(f"With noise ({args.noise:g} dB SNR, seed 42): {after['prediction']}"
              f" | genuine margin {after['genuine_margin']:.3f}")
        print(f"Noisy audio: {noisy_path}")

    print("Scores are raw model outputs, not confidence percentages.")


if __name__ == "__main__":
    main()
