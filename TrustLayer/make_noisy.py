"""Make 24 wavs from the 8 recordings: original, 20 dB SNR and 10 dB SNR.

    python make_noisy.py
"""
import json
import importlib
from pathlib import Path

sf = importlib.import_module("soundfile")

from detector import load_audio, model_window
from noise_reference import add_white_noise

root = Path(__file__).resolve().parent
out_dir = root / "results" / "audio"
out_dir.mkdir(parents=True, exist_ok=True)

manifest = json.loads((root / "assets/manifest.json").read_text())

for item in manifest:
    sample_id = item["sample_id"]

    # same 4 second clip the model uses
    original = model_window(load_audio(root / item["path"]))
    sf.write(out_dir / f"{sample_id}_original.wav", original, 16000, subtype="FLOAT")

    # add noise at each level (seed 42 for repeatability)
    for snr in (20, 10):
        noisy = add_white_noise(original, snr_db=snr, seed=42)
        sf.write(out_dir / f"{sample_id}_snr{snr}.wav", noisy, 16000, subtype="FLOAT")

    print("Done", sample_id)
