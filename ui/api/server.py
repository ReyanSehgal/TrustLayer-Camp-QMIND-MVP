"""Live scoring API for the TrustLayer UI.

Wraps the team's existing Detector without modifying it. Run from ui/:
    python -m uvicorn api.server:app --port 8000
or just `npm run dev:live`.
"""
import threading
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import scoring

SNR = Annotated[float, Field(ge=-20, le=60)]


class ScoreRequest(BaseModel):
    sample_id: str
    snr_db: SNR | None = None  # null scores the unmodified window


class SweepRequest(BaseModel):
    sample_id: str
    snr_values: list[SNR] = Field(min_length=1, max_length=25)


class SensitivityRequest(BaseModel):
    sample_id: str
    snr_db: SNR | None = None
    segments: int = Field(default=16, ge=4, le=32)


MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = scoring.Detector()
    app.state.lock = threading.Lock()  # one inference at a time
    app.state.manifest = scoring.manifest()
    app.state.windows = {}
    app.state.scales = {}
    yield


app = FastAPI(title="TrustLayer live scoring", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def prepared(sample_id: str):
    if sample_id not in app.state.manifest:
        raise HTTPException(404, f"Unknown clip. Choose one of: {', '.join(app.state.manifest)}")
    if sample_id not in app.state.windows:
        _, window = scoring.window_for(app.state.manifest[sample_id])
        app.state.windows[sample_id] = window
        app.state.scales[sample_id] = scoring.clip_scale(sample_id)
    return app.state.windows[sample_id], app.state.scales[sample_id]


@app.get("/api/health")
def health():
    return {"ok": True, "model": "AASIST (NAVER pretrained)", "clips": list(app.state.manifest)}


@app.post("/api/score")
def score(req: ScoreRequest):
    window, scale = prepared(req.sample_id)
    audio = scoring.noisy_window(window, req.snr_db)
    with app.state.lock:
        result = scoring.score(app.state.model, audio, scale)
    return {
        "sample_id": req.sample_id,
        "snr_db": req.snr_db,
        "seed": None if req.snr_db is None else scoring.SEED,
        **result,
        "audio_b64": scoring.wav_b64(audio),
    }


@app.post("/api/sweep")
def sweep(req: SweepRequest):
    window, scale = prepared(req.sample_id)
    points = []
    with app.state.lock:
        for snr in req.snr_values:
            r = scoring.score(app.state.model, scoring.noisy_window(window, snr), scale)
            points.append(
                {"snr_db": snr, "prediction": r["prediction"], "genuine_margin": r["genuine_margin"]}
            )
    return {"sample_id": req.sample_id, "seed": scoring.SEED, "points": points}


@app.post("/api/sensitivity")
def sensitivity(req: SensitivityRequest):
    window, _ = prepared(req.sample_id)
    audio = scoring.noisy_window(window, req.snr_db)
    with app.state.lock:
        base, segments = scoring.sensitivity(app.state.model, audio, req.segments)
    return {
        "sample_id": req.sample_id,
        "snr_db": req.snr_db,
        "base_margin": base,
        "method": "mute one slice at a time",
        "segments": segments,
    }


@app.post("/api/score_upload")
def score_upload(
    file: UploadFile = File(...),
    snr_db: Annotated[float | None, Form(ge=-20, le=60)] = None,
):
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is larger than 10 MB.")
    try:
        source = scoring.decode_upload(data)
    except Exception:
        raise HTTPException(422, "Could not read that audio. Try a WAV or FLAC file.")
    window = scoring.model_window(source)
    try:
        audio = scoring.noisy_window(window, snr_db)
    except ValueError as exc:
        raise HTTPException(422, "Could not add noise to silent audio. Upload a recording containing speech.") from exc
    scale = max(float(abs(window).max()), float(abs(audio).max()), 1e-6)
    with app.state.lock:
        result = scoring.score(app.state.model, audio, scale)
    return {
        "filename": (file.filename or "upload")[:80],
        "snr_db": snr_db,
        "seed": None if snr_db is None else scoring.SEED,
        "source_seconds": round(len(source) / scoring.SAMPLE_RATE, 2),
        "window_seconds": round(scoring.WINDOW_SAMPLES / scoring.SAMPLE_RATE, 2),
        "window_treatment": "repeated" if len(source) < scoring.WINDOW_SAMPLES
        else "cropped" if len(source) > scoring.WINDOW_SAMPLES else "exact",
        **result,
        "audio_b64": scoring.wav_b64(audio),
    }
