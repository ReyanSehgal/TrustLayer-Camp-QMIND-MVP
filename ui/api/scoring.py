"""Scoring helpers shared by the live API and the saved-results export.

Imports the team's Detector and add_white_noise from TrustLayer/ and never
edits them. Noise is added AFTER model_window(), seed 42, as the README asks.
"""
import base64
import io
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2] / "TrustLayer"
sys.path.insert(0, str(ROOT))

from detector import SAMPLE_RATE, WINDOW_SAMPLES, Detector, load_audio, model_window  # noqa: E402,F401
from noise_reference import add_white_noise  # noqa: E402

import json  # noqa: E402

SEED = 42
BUCKETS = 160
# Saved audio written by TrustLayer/make_noisy.py
SAVED = {"original": None, "noise20": 20, "noise10": 10}
SAVED_SUFFIX = {"original": "original", "noise20": "snr20", "noise10": "snr10"}
AUDIO_DIR = ROOT / "results" / "audio"


def manifest():
    return {row["sample_id"]: row for row in json.loads((ROOT / "assets/manifest.json").read_text())}


def window_for(item):
    source = load_audio(ROOT / item["path"])
    return source, model_window(source)


def saved_audio(sample_id, condition):
    return load_audio(AUDIO_DIR / f"{sample_id}_{SAVED_SUFFIX[condition]}.wav")


def peaks(audio, scale):
    edges = np.linspace(0, len(audio), BUCKETS + 1, dtype=int)
    out = [float(np.abs(audio[a:b]).max()) / scale for a, b in zip(edges[:-1], edges[1:])]
    return [round(min(v, 1.0), 4) for v in out]


def clip_scale(sample_id):
    """One display scale per clip: the loudest sample across the saved conditions."""
    return max(float(np.abs(saved_audio(sample_id, c)).max()) for c in SAVED) or 1.0


def score(model, audio, scale):
    result = model.predict(audio)
    top = float(np.abs(audio).max())
    return {
        "prediction": result["prediction"],
        "synthetic_logit": round(result["synthetic_logit"], 4),
        "genuine_logit": round(result["genuine_logit"], 4),
        "genuine_margin": round(result["genuine_margin"], 4),
        "inference_seconds": round(result["inference_seconds"], 4),
        "peak": round(top, 4),
        "exceeds_full_scale": bool(top > 1.0),
        "peaks": peaks(audio, scale),
    }


def noisy_window(window, snr_db):
    return window if snr_db is None else add_white_noise(window, snr_db=snr_db, seed=SEED)


def wav_b64(audio):
    buf = io.BytesIO()
    sf.write(buf, audio, SAMPLE_RATE, format="WAV", subtype="FLOAT")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def sensitivity(model, audio, segments):
    """Mute one slice at a time and see how the genuine margin moves.

    pull > 0: removing the slice lowers the margin, so it pulls toward genuine.
    pull < 0: removing it raises the margin, so it pulls toward synthetic.
    This shows where the score is sensitive, not why the model decided.
    """
    base = model.predict(audio)["genuine_margin"]
    edges = np.linspace(0, len(audio), segments + 1, dtype=int)
    out = []
    for a, b in zip(edges[:-1], edges[1:]):
        muted = audio.copy()
        muted[a:b] = 0.0
        margin = model.predict(muted)["genuine_margin"]
        out.append({
            "start_s": round(a / SAMPLE_RATE, 3),
            "end_s": round(b / SAMPLE_RATE, 3),
            "margin_without": round(margin, 4),
            "pull": round(base - margin, 4),
        })
    return round(base, 4), out


def decode_upload(data):
    """Decode uploaded audio bytes with the team's own load_audio (mono, 16 kHz)."""
    fd, name = tempfile.mkstemp(suffix=".audio")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        return load_audio(name)
    finally:
        os.unlink(name)
